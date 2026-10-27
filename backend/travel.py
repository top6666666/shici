"""来源约束的洛阳一日路线。规则编排，无实时地图或票务承诺。"""
import copy
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo
from pydantic import BaseModel, ConfigDict, StrictInt, field_validator

DATA = json.loads(Path(__file__).with_name('luoyang.json').read_text(encoding='utf-8'))
STOPS = {s['id']: s for s in DATA['stops']}
THEMES = {'tang': '唐诗寻踪', 'history': '古都文化', 'landscape': '龙门山水'}
PACES = {'light': '舒缓节奏', 'full': '充实节奏'}
ORIGINS = {'hotel': '市内住宿地', 'longmen_station': '洛阳龙门站', 'luoyang_station': '洛阳站', 'old_town': '洛阳老城'}

class RouteRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    city: Literal['洛阳'] = '洛阳'
    days: StrictInt = 1
    theme: Literal['tang', 'history', 'landscape'] = 'tang'
    pace: Literal['light', 'full'] = 'light'
    origin: Literal['hotel', 'longmen_station', 'luoyang_station', 'old_town'] = 'hotel'
    travel_date: str = ''

    @field_validator('days')
    @classmethod
    def single_day(cls, v):
        if v != 1:
            raise ValueError('目前仅支持洛阳一日路线')
        return v

    @field_validator('travel_date')
    @classmethod
    def valid_date(cls, v):
        if v and (not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v) or not date.fromisoformat(v)):
            raise ValueError('日期使用YYYY-MM-DD格式')
        return v

def duration_text(n):
    h, m = divmod(n, 60)
    return (f'{h}小时' if h else '') + (f'{m}分钟' if m else '')

def generate_route(p: RouteRequest):
    south = p.theme == 'landscape'
    full = p.pace == 'full'
    monday = bool(p.travel_date and date.fromisoformat(p.travel_date).weekday() == 0)
    ids = (['west','east','xiangshan','baiyuan'] if south else
           ['museum','lijing','luoyi'] if full else
           ['museum','lijing'] if p.theme == 'history' else ['lijing','luoyi'])
    notices = [
        '建议上午开始。所列停留、交通和休息时间是项目规划预算，不是实时路况、排队或到达预测；不含从出发地到首站及末站返程。',
        '来源核查日期：2026-10-27。入园、预约、票价与临时关闭情况请出发前向场馆确认。',
    ]
    adjusted = False
    if monday and 'museum' in ids:
        ids = ['lijing','luoyi']
        adjusted = True
        notices.append('所选日期是周一：按博物馆通常闭馆规则保守调整为老城两站。节假日可能例外；确认开放后可另行安排博物馆。')
    elif 'museum' in ids:
        notices.append('含洛阳博物馆：需先确认预约与开放情况；未选择日期时不会判断具体闭馆日。')
    if south:
        notices.extend([
            '龙门按西山石窟→东山石窟→香山寺→白园单线游览。即使舒缓节奏也有较多步行和台阶；不作为轮椅或免爬坡路线。',
            '白园仅安排日间游览；请上午抵达服务区，预留检票与进园步行时间。',
        ])
    transfer_budgets = []
    stops = []
    all_sources = {}
    for index, sid in enumerate(ids):
        s = copy.deepcopy(STOPS[sid])
        s['order'] = index + 1
        s['minutes'] = s.pop('duration_minutes')[1 if full else 0]
        s['duration_label'] = duration_text(s['minutes'])
        poem = copy.deepcopy(DATA['poems'][s.pop('poem_id')])
        refs = s.pop('source_ids') + poem.pop('source_ids')
        s['poem'] = poem
        s['sources'] = [dict(id=k, **DATA['sources'][k]) for k in dict.fromkeys(refs)]
        for src in s['sources']:
            all_sources[src['id']] = src
        if index < len(ids)-1:
            nxt = ids[index+1]
            if south:
                mins = 35 if sid == 'west' else 20
                note = '按景区导向步行衔接；跨河、检票、休息可能增加时间，是否可乘园内交通以现场为准。'
            elif sid == 'museum':
                mins = 50
                note = '市内公共交通或出租车转至老城；请在地图应用确认当天线路和用时。'
            else:
                mins = 40
                note = '老城街区间步行或市内交通；以地图应用和现场道路状况为准。'
            s['next_transfer'] = dict(to=STOPS[nxt]['name'], budget_minutes=mins,
                label=f'转场预留{mins}分钟（规划预算）', note=note)
            transfer_budgets.append(mins)
        else:
            s['next_transfer'] = None
        stops.append(s)
    if south:
        for k in ['flow','hours','traffic']:
            all_sources[k] = dict(id=k, **DATA['sources'][k])
    rest = 60
    total = sum(s['minutes'] for s in stops) + sum(transfer_budgets) + rest
    if south:
        name, reason = '伊阙山水 · 香山寻白', '将白居易香山题咏、两岸山水和诗人纪念地连成一条日间路线，按景区官方单线顺序行走。'
    elif p.theme == 'history' and not adjusted:
        name, reason = '古都文脉 · 从文物到诗句', '先从博物馆了解城市文化，再到老城读洛阳诗，比较文物、诗歌与当代城市空间。'
    else:
        name, reason = '洛城诗意 · 老城慢读', '将直接写到洛阳的唐诗与今天的老城体验配对。诗词的城市关联有依据，具体景点配读属于项目研学设计。'
    arrival = f'从{ORIGINS[p.origin]}前往首站“{stops[0]["name"]}”。'
    if south:
        arrival += '先确认龙门石窟当日服务区入口，再按官方单线游览。洛阳龙门站与洛阳站不是同一车站。'
    else:
        arrival += '请将首站完整名称复制到地图应用规划交通；到站后不要直接按本站间预算推算首程。'
    result = dict(id=f'LY-{p.theme}-{p.pace}'+('-monday' if adjusted else ''), city='洛阳', days=1,
        name=name, theme_label=THEMES[p.theme], pace_label=PACES[p.pace], preferences=p.model_dump(),
        algorithm='curated_rules_v1', data_version=DATA['version'], reviewed_at=DATA['reviewed_at'],
        summary=' → '.join(s['name'] for s in stops), reason=reason, stops=stops,
        total_minutes=total, total_label=f'约{duration_text(total)}，含转场预算及休息',
        rest_minutes=rest, rest_note='午餐及休息合计预留60分钟，可穿插在行程中，不指定商家。',
        arrival=arrival, notices=notices, sources=list(all_sources.values()), adjusted=adjusted)
    result['copy_text'] = format_route(result)
    return result

def format_route(r):
    lines = [f'洛阳一日诗旅｜{r["name"]}', r['theme_label']+' · '+r['pace_label'],
             '日期：'+(r['preferences']['travel_date'] or '尚未指定'), r['total_label'], r['arrival'], '推荐理由：'+r['reason']]
    for s in r['stops']:
        p = s['poem']
        lines.extend([f'\n{s["order"]}. {s["name"]}｜建议停留{s["duration_label"]}',
            f'《{p["title"]}》· {p["author"]}', p['text'],
            f'关联类型：{s["relation_type"]}', s['relation'], '研学任务：'+s['activity'], '参观提醒：'+s['visit_note']])
        if s['next_transfer']:
            lines.append(s['next_transfer']['label']+'。'+s['next_transfer']['note'])
    lines.extend(['\n'+r['rest_note'], '\n出行提醒：']+r['notices'])
    lines.append('\n参考来源（诗歌原文与景点信息分别核查，释义与行程为项目整理）：')
    lines.extend(s['title']+' '+s['url'] for s in r['sources'])
    return '\n'.join(lines)

def parse_travel_question(q):
    """只识别明确出游意图；未支持的硬约束必须说明，不默默丢弃。"""
    intent = bool(re.search(r'诗旅|旅[游行]|游玩|行程|路线|去哪.{0,5}玩|去.{0,12}玩|一日游|两日游|日游', q))
    # 景点史实问答不应因含“诗旅”一词就生成行程。
    if not intent:
        return None
    unsupported = re.search(r'不去|避开|只去|必须|周末|周[一二三四五六日天]|带父母|老人|儿童|两天|二天|三天|[2-9]天|[二两三四五六七八九十2-9]日|半天|半日|夜游|晚上|下午|轮椅|无障碍|不爬|不走路|不登|带老人|带孩子|亲子|预算|花费|免费|元以内|最短|最优|实时|小时|[0-9二三四五六七八九十]+点|一点(?:开始|出发|到|抵达)', q)
    foreign_city = re.search(r'开封|郑州|安阳|南阳|信阳|许昌|北京|西安|杭州|上海|成都|苏州', q)
    if unsupported or foreign_city or not re.search(r'洛阳|河南|中原|哪个城市',q):
        return {'answer':'目前可生成洛阳一日诗旅，支持唐诗、古都文化、龙门山水三类主题及两种节奏。你提出的城市、时段或其他限制尚不能由这一版可靠满足，因此没有直接生成行程。可进入“洛阳诗旅”选择条件；具体交通、无障碍条件和票务需另行核实。', 'sources':[], 'route':None}
    theme = 'landscape' if re.search(r'山水|龙门|白居易|香山|白园',q) else 'history' if re.search(r'历史|古都|博物馆|文物',q) else 'tang'
    pace = 'light' if re.search(r'轻松|舒缓|慢|少走|不赶',q) else 'full' if re.search(r'充实|紧凑|多看|丰富',q) else 'light'
    origin = 'longmen_station' if '龙门站' in q else 'luoyang_station' if '洛阳站' in q else 'old_town' if re.search(r'老城出发|从老城',q) else 'hotel'
    travel_date = ''
    found = re.search(r'\d{4}-\d{2}-\d{2}',q)
    if found:
        travel_date = found.group()
    elif re.search(r'今天|明天|后天',q):
        offset = 2 if '后天' in q else 1 if '明天' in q else 0
        travel_date = (datetime.now(ZoneInfo('Asia/Shanghai')).date()+timedelta(days=offset)).isoformat()
    try:
        route = generate_route(RouteRequest(theme=theme,pace=pace,origin=origin,travel_date=travel_date))
    except ValueError:
        return {'answer':'日期无效，请使用真实的YYYY-MM-DD日期，例如2026-11-03。','sources':[],'route':None}
    intro = '先推荐已核查的洛阳试点路线；目前未做河南各城市的全面比较。\n\n' if '洛阳' not in q else ''
    # 回答简洁，完整诗文、任务、来源与注意事项由路线页展示。
    answer = intro+'为你安排：'+route['name']+'\n'+route['summary']+'\n'+route['total_label']+'。\n主题：'+route['theme_label']+'；节奏：'+route['pace_label']+'。\n'+route['reason']+'\n'+route['arrival']
    if route['adjusted']:
        answer += '\n'+route['notices'][-1]
    answer += '\n这是基于核查资料的规则编排行程。请打开完整路线查看每站诗词、关联依据与出行提醒；预计用时不含首程和返程。'
    return {'answer':answer,'sources':route['sources'],'route':route}
