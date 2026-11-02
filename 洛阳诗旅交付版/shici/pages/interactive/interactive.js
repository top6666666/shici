// 互动页 · 诗词接龙（多题）+ AI诗人对话 + 诗词护照入口
const JIELONG = [
  { q: "“海内存知己”的下一句是？", correct: "天涯若比邻", dists: ["江春入旧年", "明月何时照我还", "只缘身在最高层"] },
  { q: "“春蚕到死丝方尽”的下一句是？", correct: "蜡炬成灰泪始干", dists: ["春风吹又生", "月是故乡明", "一片冰心在玉壶"] },
  { q: "“会当凌绝顶”的下一句是？", correct: "一览众山小", dists: ["齐鲁青未了", "阴阳割昏晓", "决眦入归鸟"] },
  { q: "“此夜曲中闻折柳”的下一句是？", correct: "何人不起故园情", dists: ["散入春风满洛城", "谁家玉笛暗飞声", "天涯共此时"] },
  { q: "“露从今夜白”的下一句是？", correct: "月是故乡明", dists: ["边秋一雁声", "戍鼓断人行", "有弟皆分散"] },
  { q: "“沉舟侧畔千帆过”的下一句是？", correct: "病树前头万木春", dists: ["二十三年弃置身", "到乡翻似烂柯人", "暂凭杯酒长精神"] },
  { q: "“衣带渐宽终不悔”的下一句是？", correct: "为伊消得人憔悴", dists: ["望极春愁", "无言谁会凭阑意", "对酒当歌"] },
  { q: "“潮平两岸阔”的下一句是？", correct: "风正一帆悬", dists: ["行舟绿水前", "江春入旧年", "归雁洛阳边"] }
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

Page({
  data: {
    questions: [],
    cur: 0,
    answered: false,
    picked: -1,
    score: 0,
    correct: 0,
    total: 0,
    finished: false
  },
  onLoad() {
    this.build();
  },
  build() {
    const qs = JIELONG.map(item => {
      const opts = shuffle(item.dists.concat([item.correct]));
      return { q: item.q, opts, ans: opts.indexOf(item.correct) };
    });
    this.setData({ questions: shuffle(qs), cur: 0, answered: false, picked: -1, score: 0, correct: 0, total: qs.length, finished: false });
  },
  answer(e) {
    if (this.data.answered) return;
    const i = +e.currentTarget.dataset.index;
    const q = this.data.questions[this.data.cur];
    const right = i === q.ans;
    this.setData({ answered: true, picked: i, score: this.data.score + (right ? 10 : 0), correct: this.data.correct + (right ? 1 : 0) });
    wx.showToast({ title: right ? "回答正确！" : "再想想，看下一句", icon: right ? "success" : "none" });
  },
  next() {
    if (this.data.cur === this.data.total - 1) { this.setData({ finished: true }); return; }
    this.setData({ cur: this.data.cur + 1, answered: false, picked: -1 });
  },
  talk(e) {
    const n = e.currentTarget.dataset.name;
    const map = { "杜甫": "/pages/poet-chat/poet-chat", "李白": "/pages/poet-libai/poet-libai", "李商隐": "/pages/poet-yishan/poet-yishan" };
    wx.navigateTo({ url: map[n] || "/pages/poet-chat/poet-chat" });
  },
  goStamp() { wx.navigateTo({ url: "/pages/stamp/stamp" }); },
  goQuiz() { wx.navigateTo({ url: "/pages/quiz/quiz" }); },
  goRoute() { wx.navigateTo({ url: "/pages/route-explore/route-explore" }); },
  goPassport() { wx.navigateTo({ url: "/pages/passport/passport" }); }
});
