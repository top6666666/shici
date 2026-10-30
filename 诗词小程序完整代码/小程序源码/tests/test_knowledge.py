import sys,json,asyncio
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parents[1]/'backend'))
import knowledge as k
import main as m
import httpx,pytest

@pytest.mark.parametrize('q,pid',[(r['title'],r['id']) for r in k.RECORDS])
def test_each_title(q,pid):assert pid in [r['id'] for r in k.retrieve(q)]
@pytest.mark.parametrize('q,pid',[('洛阳城里见秋风是谁写的','P001'),('归雁洛阳边在哪里','P009'),('月明直见嵩山雪','P004'),('嵩高是什么意思','P003'),('李白的洛阳陌全文','P020')])
def test_matching(q,pid):assert k.retrieve(q)[0]['id']==pid
@pytest.mark.parametrize('q',['火星旅游','《春晓》的作者','明天北京天气','《不存在的诗》与洛阳有关吗'])
def test_unknown(q):assert k.retrieve(q)==[]
@pytest.mark.parametrize('content',['恶意编造：https://evil.test','{"fact_ids":["P999.text"]}','{}','null','{"fact_ids": [1]}'])
def test_fabricated_output(content):
 a,s,used=k.render('《秋思》的开封是开封市吗',k.retrieve('秋思'),content)
 assert '不指开封市' in a and 'evil' not in a and not used
 assert s[0]['poem_id']=='P001'

def test_good_output():
 a,s,used=k.render('秋思作者是谁',k.retrieve('秋思'),'{"fact_ids":["P001.identity"]}')
 assert used and '张籍' in a and s[0]['citation']==1

def test_followup_and_isolation():
 k.SESSIONS.clear();conv,ids=k.session('unknown');assert conv!='unknown'
 k.remember(conv,k.retrieve('次北固山下'));_,ids=k.session(conv)
 assert k.retrieve('这首诗写于哪里',ids)[0]['id']=='P009'
 assert k.retrieve('《春晓》在哪里写的',ids)==[]
 assert k.session('different')[1]==[]

def test_missing_year_is_forced():
 a,_,_=k.render('《春夜洛城闻笛》具体哪年写成',k.retrieve('春夜洛城闻笛'),'{"fact_ids":["P002.identity"]}')
 assert '未获充分核实' in a

async def post(body):
 async with httpx.AsyncClient(transport=httpx.ASGITransport(app=m.app),base_url='http://test') as c:
  return await c.post('/api/poetry/ask',json=body)

@pytest.mark.parametrize('body',[{}, {'question':' '},{'question':12},{'question':'x'*2001},{'question':'秋思','conversation_id':'x'*129}])
def test_validation(body):assert asyncio.run(post(body)).status_code==400

def test_no_model_fallback():
 with patch.object(m,'client',None):r=asyncio.run(post({'question':'秋思作者是谁'}))
 assert r.status_code==200 and '张籍' in r.json()['data']['answer'] and r.json()['data']['sources']

def test_unknown_skips_model():
 async def bad(**kw):raise AssertionError('must not call')
 with patch.object(m,'client',NS(chat=NS(completions=NS(create=bad)))):
  r=asyncio.run(post({'question':'《春晓》'}))
 assert not r.json()['data']['sources'] and '未找到' in r.json()['data']['answer']

def test_async_deadline_and_health():
 async def run():
  entered=asyncio.Event();cancelled=asyncio.Event()
  async def create(**kw):
   assert 'P001.identity' in kw['messages'][1]['content'];entered.set()
   try:await asyncio.sleep(30)
   finally:cancelled.set()
  with patch.object(m,'client',NS(chat=NS(completions=NS(create=create)))),patch.object(m,'REQUEST_TIMEOUT',0.08):
   pending=asyncio.create_task(post({'question':'秋思'}));await entered.wait()
   assert (await m.root())['knowledge_base_count']==21
   r=await pending
  assert cancelled.is_set() and r.status_code==200 and r.json()['data']['sources']
 asyncio.run(run())

def test_source_integrity():
 assert len(k.BY_ID)==21
 for r in k.RECORDS:
  assert r['sources'][0]['url'].startswith('https://')
  assert len({f['id'] for f in r['facts']})==len(r['facts'])
