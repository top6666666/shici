# 中原诗旅智导 · 前端（成员 A）联调文档

> 后端接口由成员 B 提供。本文档给前端开发同学直接使用。
> 首版仅文字问答；**接口未部署公网前，小程序真机无法直接调用**，只能在
> 微信开发者工具（不校验合法域名）或本机调试中使用，详见第 4 节。

---

## 1. 接口信息

| 项目 | 值 |
|---|---|
| 方法 | POST |
| 路径 | /api/poetry/ask |
| 请求头 | Content-Type: application/json |
| 本地调试地址 | http://127.0.0.1:8000/api/poetry/ask |
| 公网地址 | 待成员 B 部署后提供（HTTPS） |

## 2. 请求示例

```json
{
  "question": "《春晓》的作者是谁？这首诗表达了什么？",
  "conversation_id": ""
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| question | string | 是 | 用户问题；去除空格后不能为空；上限 2000 字 |
| conversation_id | string | 否 | 上一轮返回的会话标识；为空则服务端新生成 |

**前端建议**：把上一轮响应里的 `data.conversation_id` 原样带回，
实现同一会话的连续性；没有则传空字符串。

## 3. 响应示例

**成功**（HTTP 200）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "answer": "AI 回答内容",
    "sources": [],
    "conversation_id": "a1b2c3d4e5f6..."
  }
}
```

**失败**（HTTP 4xx/5xx，注意 `data` 为 null）：

```json
{ "code": 40001, "message": "question 不能为空", "data": null }
```

**前端判断规则**：
- `code === 0` → 成功，取 `data.answer` 展示；
- `code !== 0` 或 HTTP 非 2xx → 失败，把 `message` 展示给用户；
- `data.sources` 首版恒为空数组，前端可隐藏来源区块（后续 RAG 接入后再展示）。

## 4. 小程序端调用注意事项（重要）

1. **合法域名**：微信小程序正式版/真机要求请求地址必须是已在小程序后台
   配置的 **HTTPS 合法域名**；`http://127.0.0.1` 只适用于本地开发调试。
2. **本地开发**：微信开发者工具 → 详情 → 本地设置 → 勾选
   “不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。
3. **超时设置**：模型回答一般 1~5 秒，建议 `wx.request` 的 `timeout` 设
   为 15000ms 以上，并在 `complete` 回调里处理 loading 状态。
4. **错误提示**：网络失败、`statusCode !== 200`、`res.data.code !== 0`
   都要给出可读提示，并支持“重试”按钮。

## 5. 前端调用代码参考（wx.request）

```javascript
function askPoetry(question, conversationId) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'http://127.0.0.1:8000/api/poetry/ask', // 本地调试地址，上线换 HTTPS
      method: 'POST',
      timeout: 20000,
      header: { 'Content-Type': 'application/json' },
      data: { question: question, conversation_id: conversationId || '' },
      success(res) {
        if (res.statusCode === 200 && res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          const msg = (res.data && res.data.message) || '服务异常，请稍后再试';
          reject(new Error(msg));
        }
      },
      fail() { reject(new Error('网络连接失败，请检查网络后重试')); }
    });
  });
}

// 使用示例
askPoetry('《春晓》的作者是谁？', '')
  .then((data) => { console.log('回答：', data.answer, '会话：', data.conversation_id); })
  .catch((e) => { wx.showToast({ title: e.message, icon: 'none' }); });
```

## 6. 错误码速查

| code | 含义 | 前端建议提示 |
|---|---|---|
| 40001 | question 为空 | 输入内容后再发送 |
| 40002/40003 | 参数过长 | 缩短后重试 |
| 40004 | 请求体非法 | 请联系后端 |
| 50001 | 服务未配置密钥 | “服务维护中，请稍后再试” |
| 50002 | 密钥无效 | “服务配置异常，请联系管理员” |
| 50003 | 限流/额度用完 | “服务繁忙，请稍后再试” |
| 50004 | 超时 | “回答超时，请重试” |
| 50005/50007/50009 | 网络/上游错误 | “服务异常，请稍后再试” |

## 7. 联调前双方确认

- [ ] 接口地址（本地/公网）与部署时间
- [ ] 请求/响应字段是否与本文档一致
- [ ] conversation_id 是否由前端原样回传
- [ ] 错误提示文案与重试机制
- [ ] 至少 10 个测试问题双方各测一遍
