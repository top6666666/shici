"""Small audited corpus: deterministic retrieval and evidence-only rendering."""
import json
import re
import time
import uuid
from collections import OrderedDict
from pathlib import Path

DATA = json.loads(Path(__file__).with_name('poems.json').read_text(encoding='utf-8'))
RECORDS = DATA['records']
BY_ID = {r['id']: r for r in RECORDS}
SESSIONS = OrderedDict()  # Only poem IDs, no questions, answers, or personal information.
TTL = 1800

def norm(s):
    return re.sub(r'[^\w\u4e00-\u9fff]', '', s).lower()

def retrieve(question, previous=()):
    q = norm(question)
    explicit = [r for r in RECORDS if norm(r['title']) in q or r['id'].lower() in q]
    named = re.findall(r'《([^》]+)》', question)
    if named:
        explicit = [r for r in RECORDS if any(norm(n)==norm(r['title']) for n in named)]
        if not explicit:return []
    if explicit:return sorted(explicit,key=lambda r:len(r['title']),reverse=True)[:4]
    scored=[]
    for r in RECORDS:
        score=0
        if r['author'] in question:score+=8
        for line in re.split(r'[，。！？\n]',r['text']):
            line=norm(line)
            if len(line)>=4 and (line in q or any(line[j:j+4] in q for j in range(len(line)-3))):score+=30
        for term in ['洛阳','洛城','嵩山','嵩高','淇水','汴河','济源','滑州','天津桥','上阳']:
            if term in question and term in (r['title']+r['text']):score+=4
        for theme in r['themes'].split('；'):
            if len(theme)>1 and theme in question:score+=2
        if score>=4:scored.append((score,r))
    if scored:
        scored.sort(key=lambda x:x[0],reverse=True)
        best=scored[0][0]
        return [r for score,r in scored if score>=max(4,best*0.5)][:4]
    if re.search(r'这首|此诗|这句|它|那首|作者是谁|写于哪|什么时候写',question):
        return [BY_ID[i] for i in previous if i in BY_ID][:4]
    return []

def session(conversation_id):
    now=time.monotonic()
    for k in list(SESSIONS):
        if now-SESSIONS[k][0]>TTL:SESSIONS.pop(k,None)
    if conversation_id in SESSIONS:
        _,ids=SESSIONS[conversation_id]
        SESSIONS.move_to_end(conversation_id)
        return conversation_id,ids
    return uuid.uuid4().hex,[]

def remember(conv,records):
    SESSIONS[conv]=(time.monotonic(),[r['id'] for r in records])
    SESSIONS.move_to_end(conv)
    while len(SESSIONS)>500:SESSIONS.popitem(last=False)

def fallback_ids(question,records):
    # Even an unavailable model can display relevant, traceable corpus excerpts.
    kinds=['identity']
    if re.search(r'原文|全文|背诵|完整',question):kinds+=['text']
    if re.search(r'意思|解释|翻译|赏析|情感|表达|为什么',question):kinds+=['meaning','notes']
    if re.search(r'河南|中原|哪里|哪儿|洛阳|景点|联系|关系|关联|地点',question):kinds+=['relation']
    if re.search(r'年份|哪年|几月|创作|背景|写于|什么时候|具体|景区|地址',question):kinds+=['limits']
    if re.search(r'开封|折柳|嵩高|妻子|青春|骑白龙',question):kinds+=['notes']
    if len(kinds)==1 and not re.search(r'作者|谁写',question):kinds+=['meaning','relation']
    return [f['id'] for r in records for f in r['facts'] if f['kind'] in kinds]

def prompt(records):
    return json.dumps([{'poem_id':r['id'],'title':r['title'],'facts':r['facts']} for r in records],ensure_ascii=False)

def render(question,records,model_content=None):
    allowed={f['id']:(r,f) for r in records for f in r['facts']}
    chosen=[]
    if model_content:
        try:
            obj=json.loads(model_content)
            ids=obj.get('fact_ids')
            if isinstance(ids,list) and 0<len(ids)<=20 and all(isinstance(i,str) and i in allowed for i in ids):chosen=list(dict.fromkeys(ids))
        except (ValueError,TypeError,AttributeError):pass
    used_model=bool(chosen)
    if not chosen:chosen=fallback_ids(question,records)
    # Identity and unknown boundaries cannot be suppressed by model output.
    for i in fallback_ids(question,records):
        if allowed[i][1]['kind'] in ('identity','limits','notes') and i not in chosen:chosen.append(i)
    chosen=chosen[:24]
    answer=[];sources=[]
    for r in records:
        facts=[allowed[i][1] for i in chosen if allowed[i][0]['id']==r['id']]
        if not facts:continue
        index=len(sources)+1
        source=r['sources'][0]
        sources.append({'title':f'[{index}] {r["id"]} · '+source['title'],'url':source['url'],'poem_id':r['id'],'citation':index,'reviewed_at':r['reviewed_at']})
        answer.append(f'《{r["title"]}》· {r["author"]} [{index}]\n'+'\n'.join(f['text'] for f in facts))
    return '\n\n'.join(answer),sources,used_model
