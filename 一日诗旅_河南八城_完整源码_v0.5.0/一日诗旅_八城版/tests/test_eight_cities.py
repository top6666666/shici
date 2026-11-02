import asyncio
import copy
import itertools
import json
from pathlib import Path
import pytest
from pydantic import ValidationError
from test_travel import post
from travel import CITIES, HENAN, RouteRequest, generate_route, parse_travel_question

CASES=[(city,t['id'],pace) for city,c in CITIES.items() for t in c['themes'] for pace in ['light','full']]
@pytest.mark.parametrize('city,theme,pace', CASES)
@pytest.mark.parametrize('day',['','2026-11-02','2026-11-03'])
def test_all_city_routes_have_evidence_and_sane_budgets(city,theme,pace,day):
 r=generate_route(RouteRequest(city=city,theme=theme,pace=pace,travel_date=day))
 assert r['city']==r['preferences']['city']==city
 assert 2<=len(r['stops'])<=4
 assert r['total_minutes']<=480
 assert r['total_minutes']==60+sum(s['minutes']+(s['next_transfer']['budget_minutes'] if s['next_transfer'] else 0) for s in r['stops'])
 assert len({s['id'] for s in r['stops']})==len(r['stops'])
 assert city in r['copy_text']
 for s in r['stops']:
  assert s['poem']['text'] and s['poem']['meaning'] and s['relation'] and s['activity']
  assert s['sources'] and all(ref['url'].startswith('https://') and ref['scope'] for ref in s['sources'])
  if city!='洛阳': assert all(ref['id'] in HENAN['sources'] for ref in s['sources'])
@pytest.mark.parametrize('city',list(CITIES))
def test_api_city_request_and_natural_language_agree(city):
 d=asyncio.run(post('/api/travel/recommend',{'city':city})).json()['data']
 q=asyncio.run(post('/api/poetry/ask',{'question':'帮我推荐'+city+'一日诗旅路线，轻松一点'})).json()['data']
 assert d['city']==q['route']['city']==city
 assert d['summary']==q['route']['summary']
 assert q['sources']
@pytest.mark.parametrize('city',list(CITIES))
def test_origins_are_city_scoped(city):
 for option in CITIES[city]['origins']:
  r=generate_route(RouteRequest(city=city,origin=option['id']))
  assert option['label'] in r['arrival']
 with pytest.raises(ValidationError):
  RouteRequest(city=city,origin='city_center' if city=='洛阳' else 'longmen_station')
def test_zhengzhou_monday_and_independent_mutations():
 r=generate_route(RouteRequest(city='郑州',travel_date='2026-11-02'))
 assert r['adjusted'] and 'zz_museum' not in [s['id'] for s in r['stops']]
 assert r['stops'][0]['next_transfer']['budget_minutes']==25
 r['stops'][0]['poem']['text']='changed'
 assert generate_route(RouteRequest(city='郑州'))['stops'][0]['poem']['text']!='changed'
@pytest.mark.parametrize('q',['新密夜游路线','新乡无障碍诗旅','荥阳两日游','新乡不去百泉的一日游','推荐洛阳和开封一日诗旅','推荐安阳一日游'])
def test_constraints_do_not_disappear(q):
 assert parse_travel_question(q)['route'] is None
def test_departure_city_does_not_override_destination():
 assert parse_travel_question('从郑州出发去巩义一日诗旅')['route']['city']=='巩义'
 assert parse_travel_question('从洛阳龙门站出发，推荐洛阳唐诗一日游')['route']['preferences']['theme']=='tang'
def test_catalog_is_synchronized():
 root=Path(__file__).parents[1]
 js=(root/'shici/utils/travelCities.js').read_text().split('module.exports=',1)[1].rstrip(';\n')
 assert json.loads(js)==list(CITIES.values())
 for city,c in HENAN['cities'].items():
  assert len(c['transfers'])==len(c['stops'])-1
  for s in c['stops']:
   assert s['poem_id'] in HENAN['poems']
   for ref in s['source_ids']+HENAN['poems'][s['poem_id']]['source_ids']:assert ref in HENAN['sources']
def test_source_types_and_newxiang_geography_are_explicit():
 r=generate_route(RouteRequest(city='新乡'))
 assert '辉县' in r['arrival'] and all('辉县' in s['address'] for s in r['stops'])
 r=generate_route(RouteRequest(city='荥阳'))
 assert all(s['relation_type']=='诗人纪念地关联' for s in r['stops'])
 assert '不作为写作地' in r['stops'][1]['relation']
