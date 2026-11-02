// AI 诗人对话 · 公共逻辑工厂
// 每个诗人一个独立页面文件，调用 buildPage("诗人名") 生成对应 Page 配置，
// 不再依赖页面 query 传参，从根本上避免诗人串台。
const { POETS } = require("../data/poets.js");

function buildPage(name) {
  const p = POETS[name] || POETS["杜甫"];
  return {
    data: {
      poet: { name: p.name, subtitle: p.subtitle, avatar: p.avatar },
      messages: [{ role: "poet", text: p.intro }],
      input: "",
      quick: p.quick,
      thinking: false
    },
    onLoad() {
      wx.setNavigationBarTitle({ title: "与" + p.name + "对话" });
      this.scrollToBottom();
    },
    onUnload() {
      clearTimeout(this._timer);
      clearTimeout(this._timer2);
    },
    onInput(e) {
      this.setData({ input: e.detail.value });
    },
    send() {
      const text = (this.data.input || "").trim();
      if (!text) return;
      this.pushUser(text);
      this.reply(text);
      this.setData({ input: "" });
    },
    quickTap(e) {
      const q = e.currentTarget.dataset.q;
      this.pushUser(q);
      this.reply(q);
    },
    pushUser(text) {
      this.setData({ messages: this.data.messages.concat([{ role: "user", text }]) });
      this.scrollToBottom();
    },
    pushPoet(text) {
      this.setData({ messages: this.data.messages.concat([{ role: "poet", text }]) });
      this.scrollToBottom();
    },
    answer(text) {
      for (const r of p.replies) {
        if (r.keys.some(k => text.indexOf(k) > -1)) return r.reply;
      }
      return p.fallback;
    },
    reply(text) {
      this.setData({ thinking: true });
      this._timer = setTimeout(() => {
        this.setData({ thinking: false });
        this.pushPoet(this.answer(text));
      }, 450);
    },
    scrollToBottom() {
      this._timer2 = setTimeout(() => {
        this.setData({ toView: "msg-" + (this.data.messages.length - 1) });
      }, 60);
    }
  };
}

module.exports = { buildPage };
