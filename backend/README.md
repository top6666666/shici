# 中原诗旅智导 · 后端服务（成员 B）

FastAPI + 阿里云百炼（通义千问）基础文字问答服务。首版只实现
`POST /api/poetry/ask`，未接入知识库（RAG）前 `data.sources` 恒为空数组。

---

## 1. 目录结构

```
shici/
├── backend/                  # 本后端（与小程序前端分开）
│   ├── main.py               # FastAPI 应用与接口实现
│   ├── requirements.txt      # Python 依赖
│   ├── .env.example          # 环境变量模板（可提交）
│   ├── .env                  # 本地真实配置（已 gitignore，含 API Key）
│   ├── test_api.ps1          # Windows PowerShell 接口测试脚本
│   ├── test_questions.md     # 10+ 条测试问题清单
│   └── api_docs_for_member_A.md  # 给前端（成员 A）的联调文档
├── .gitignore                # 仓库忽略规则（backend/.env 等）
└── 中原诗词文旅小程序_地图黑块修复版 (1)/   # 成员 A 的小程序前端（未改动）
```

## 2. 环境与依赖

- Python：`D:\python\python.exe`（3.14.3）
- 依赖：`fastapi`、`uvicorn[standard]`、`python-dotenv`、`openai`（已安装）

如需在别的机器重装：

```powershell
pip install -r requirements.txt
```

## 3. 配置 API Key（重要）

1. 打开 `backend/.env`（用编辑器，不要发到聊天/群里）；
2. 在 `DASHSCOPE_API_KEY=` 后粘贴百炼控制台创建的密钥；
3. 确认 `DASHSCOPE_MODEL` 与百炼控制台「模型广场」实际可调用的模型代码一致；
4. 保存后重启服务。

> `.env` 已加入 `.gitignore`，不会提交到仓库；密钥绝不写入前端或日志。

## 4. 启动 / 停止

启动（在 `backend` 目录下）：

```powershell
cd C:\Users\和\Desktop\shici\backend
D:\python\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

- 接口文档（Swagger）：http://127.0.0.1:8000/docs
- 健康检查：http://127.0.0.1:8000/
- 停止：在运行窗口按 `Ctrl + C`；若在后台运行，用
  `Get-Process python | Stop-Process`（谨慎，会结束所有 python 进程，建议记住 PID 定向停止）。

开发时热重载可加 `--reload`。

## 5. API 文档

### POST /api/poetry/ask

**请求头**：`Content-Type: application/json`

**请求体**：

```json
{
  "question": "《春晓》的作者是谁？这首诗表达了什么？",
  "conversation_id": ""
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| question | string | 是 | 用户问题，去除空格后不能为空，上限 2000 字 |
| conversation_id | string | 否 | 会话标识，为空时服务端自动生成（32 位 hex） |

**成功响应**（HTTP 200）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "answer": "AI 回答内容",
    "sources": [],
    "conversation_id": "服务端生成或沿用的会话标识"
  }
}
```

**错误响应**（HTTP 4xx/5xx，统一 JSON）：

```json
{ "code": 40001, "message": "question 不能为空", "data": null }
```

### 错误码表

| HTTP | code | 含义 |
|---|---|---|
| 400 | 40001 | question 缺失 / 非字符串 / 为空 |
| 400 | 40002 | question 过长（>2000 字） |
| 400 | 40003 | conversation_id 过长（>128 字符） |
| 400 | 40004 | 请求体不是有效 JSON |
| 400 | 50006 | 模型请求被拒绝（多半是模型代码不可用） |
| 403 | 50008 | 账号无权限调用该模型 |
| 502 | 50002 | API Key 无效（鉴权失败） |
| 502 | 50005 | 无法连接模型服务 |
| 502 | 50007 | 模型服务内部错误 |
| 502 | 50009 | 未知上游错误 |
| 503 | 50001 | 服务未配置密钥（backend/.env 未填） |
| 503 | 50003 | 限流或免费额度已用完 |
| 504 | 50004 | 模型调用超时（30s） |

## 6. 本机测试

启动后端后，另开终端：

```powershell
cd C:\Users\和\Desktop\shici\backend
powershell -ExecutionPolicy Bypass -File .\test_api.ps1
```

或手动单条测试：

```powershell
$body = '{"question":"《春晓》的作者是谁？","conversation_id":""}'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/poetry/ask" -Method Post `
  -ContentType "application/json; charset=utf-8" -Body $body
```

### 测试记录（2026-10-24 本机执行）

| 场景 | 预期 | 结果 |
|---|---|---|
| 正常诗词问答 | code=0，answer 中文回答 | 待填写（需 .env 密钥后运行） |
| 空问题 | 4xx | 待填写 |
| 缺少 question | 4xx | 待填写 |
| 无效 JSON | 4xx | 待填写 |
| conversation_id 沿用 | 返回相同值 | 待填写 |
| 密钥缺失 | 503 + 可读提示 | 待填写 |
| 10+ 问题质量验证 | 全部 code=0 | 待填写 |

## 7. 已知限制（首版）

- 无长期记忆：每轮请求独立，仅靠 conversation_id 标识会话，不保存历史。
- 未接入知识库：回答依赖模型通用知识，`sources` 恒为空数组，不伪造来源。
- 免费额度用完即停：已开启“额度用完即停”，不会产生额外费用；超限返回 503。
- 仅适合本地/开发调试；微信小程序真机需公网 HTTPS 合法域名（见联调文档）。

## 8. 后续计划（RAG）

1. 接收成员 A 整理的诗词/景点/路线资料（Excel/CSV，统一字段）；
2. 建立检索库（文本切片 + 向量化，可用百炼向量模型或本地方案）；
3. 在 `/api/poetry/ask` 内先检索再回答，命中时在 `data.sources` 返回
   `{"title":"春晓","type":"poem"}` 等真实来源；
4. 资料来源缺失或未核实时，明确返回不确定，不编造。

## 9. 费用控制

- 不充值、不购买节省计划、不开通付费服务；
- 单次输出上限 `MAX_TOKENS=800`、请求超时 `30s`、重试 1 次；
- 免费额度用完即停；公网部署前会先列明费用并等待明确同意。
