// AI 问诗助手 · 页面逻辑
// 接口调用统一走 utils/aiAsk.js，后续接云函数只改那一个文件
const { ask } = require("../../utils/aiAsk.js");

Page({
  data: {
    messages: [
      { role: "ai", text: "你好，我是中原诗词 AI 助手。可以问我诗句意思、诗人典故、河南诗旅相关问题，我来帮你解答。" }
    ],
    input: "",
    loading: false,
    quick: ["《春望》表达了什么情感？", "河南有哪些著名诗人？", "杜甫在巩义写过什么诗？"],
    toView: ""
  },

  onLoad() {
    this.scrollToBottom();
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  // 发送：空输入 toast 提示
  send() {
    const text = (this.data.input || "").trim();
    if (!text) {
      wx.showToast({ title: "先问点什么吧", icon: "none" });
      return;
    }
    this.pushUser(text);
    this.setData({ input: "" });
    this.callAi(text);
  },

  // 点快捷问题
  quickTap(e) {
    const q = e.currentTarget.dataset.q;
    this.pushUser(q);
    this.callAi(q);
  },

  // 失败气泡点击重试：删掉失败气泡，重新发上一条
  retry(e) {
    const text = e.currentTarget.dataset.text;
    const msgs = this.data.messages.slice();
    msgs.pop();
    this.setData({ messages: msgs });
    this.callAi(text);
  },

  pushUser(text) {
    this.setData({ messages: this.data.messages.concat([{ role: "user", text }]) });
    this.scrollToBottom();
  },

  pushAi(text) {
    this.setData({ messages: this.data.messages.concat([{ role: "ai", text }]) });
    this.scrollToBottom();
  },

  pushError(text) {
    this.setData({
      messages: this.data.messages.concat([{ role: "error", text: "请求失败，点击重试", failText: text }])
    });
    this.scrollToBottom();
  },

  callAi(text) {
    this.setData({ loading: true });
    ask(text)
      .then(res => this.pushAi(res))
      .catch(() => this.pushError(text))
      .finally(() => this.setData({ loading: false }));
  },

  scrollToBottom() {
    setTimeout(() => {
      const len = this.data.messages.length;
      this.setData({ toView: "msg-" + len });
    }, 60);
  }
});
