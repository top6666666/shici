# 中原诗旅智导 v0.4.0 · 洛阳一日诗旅

原有来源问答继续运行，新增洛阳路线。Render根目录仍为backend，安装命令 `pip install -r requirements.txt`，启动命令 `uvicorn main:app --host 0.0.0.0 --port $PORT`。保留现有环境变量，无需新增密钥或付费地图服务。

## 路线接口

POST /api/travel/recommend

```json
{"city":"洛阳","days":1,"theme":"tang","pace":"light","origin":"hotel","travel_date":"2026-11-03"}
```

- theme：tang唐诗寻踪、history古都文化、landscape龙门山水。
- pace：light舒缓、full充实。
- origin：hotel市内住宿地、longmen_station洛阳龙门站、luoyang_station洛阳站、old_town洛阳老城。用于首程提醒，不代表实时交通优化。
- travel_date：YYYY-MM-DD，可空；周一涉及博物馆时保守改为老城两站，节假日例外需自行核实。
- 返回 `{code:0,message:"success",data:route}`；参数错误HTTP 400。
- route含preferences、stops、sources、copy_text、total_minutes、notices、reviewed_at。每站含诗文、解释、关联类型与边界、研学任务和来源。
- 7个点位、4首关联诗词；三种主题×两种节奏。不同主题允许共用点位，不声称六条完全不同的道路或最短路径优化。

## 问答兼容

POST /api/poetry/ask的question、conversation_id参数不变。明确的洛阳/河南出游问题返回文字、来源及可选data.route；旧前端可继续显示文字，新前端可打开完整路线。

路线采用已核查数据和确定性规则，不调用模型编造景点。多日、夜游、半日、无障碍、预算等不支持的常见明确约束会提示边界，不直接生成不满足条件的路线。自然语言解析仅覆盖常见说法，并非任意约束理解；复杂需求请使用表单确认。未提供日期时不猜测闭馆日。路线对话不保存偏好，调整路线使用详情页表单。

资料问答仍为：检索诗词→模型选择事实ID→程序验证并输出现有事实与来源。模型失败或缺少密钥时返回资料摘录。目前21首：原200首中的20首复核记录，加LYP001《初入香山院对月》，不是200首全部接入。会话仅保存最近诗词ID，30分钟过期、单进程最多500会话。

## 数据与边界

- poems.json：问答资料；luoyang.json：路线点位、诗歌、来源。新增诗使用LYP前缀。
- 核对网络原文与署名，未作纸本定本校勘；释义、任务与用时预算为项目整理。
- 区分题咏地、诗人纪念地与主题配读；不把现代景区说成确定写作现场。
- 龙门按西山→东山→香山寺→白园单线游览；舒缓也有台阶。
- 停留与转场为规划预算，含60分钟午餐休息，不含首程返程。
- 未接入实时地图、票务库存、天气和交通。地点按钮提供地址复制。
- API沿用比赛原型的公开调用方式和既有模型额度配置。

## 验证

在交付包根目录安装pytest后运行：

```bash
python -m pytest tests -q
node tests/test_frontend.js
node tests/test_travel_frontend.js
python tests/check_project.py
```

覆盖来源约束、主题节奏、单线顺序、周一调整、时间预算、参数错误、越界需求、原问答回归、网络失败、取消、离页响应、保存复制与分享。微信开发者工具编译及手机布局、真机网络仍需在微信环境验收。
