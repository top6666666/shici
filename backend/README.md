# 中原诗旅后端 · 河南八城

版本：`0.5.0-henan-eight-cities`。

支持洛阳、开封、郑州、登封、新乡、新密、巩义、荥阳的一日诗旅。路线以核查资料及规则编排，问答资料库目前为21条，不等同于200首整理初稿。

## Render 部署

本目录是线上部署目录，Root Directory 填 `backend`。

Build Command：`pip install -r requirements.txt`

Start Command：`uvicorn main:app --host 0.0.0.0 --port $PORT`

保留服务端已有模型环境变量，不上传真实 `.env`。路线不依赖模型密钥；模型不可用时，问答可降级为资料摘录。

## 接口验收

- `GET /`：检查版本及 `travel_cities`。
- `GET /api/travel/cities`：获取8城的主题及出发地选项。
- `POST /api/travel/recommend`：例如 `{"city":"新密","days":1,"pace":"light","origin":"hotel"}`。省略主题时使用城市默认主题，不要向所有城市固定发送洛阳主题。
- `POST /api/poetry/ask`：诗词资料问答与常见诗旅需求识别。

路线返回诗词、景点关联说明、参考来源、研学任务和时间预算；未接入实时路况、天气、票务或导航。开放与预约条件以官方当日公告为准。

## 目录维护

为兼容Render英文路径限制，本目录由 `有关小程序全部代码/backend` 的八城版本复制建立。线上以根目录 `backend` 为准；后续修改请维护此目录，避免仅修改嵌套副本。
