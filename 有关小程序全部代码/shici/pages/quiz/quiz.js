// 诗句答对 · 诗词闯关（题库基于 data/poems.js，上句接下句）
const QUIZ = [
  { q: "“春蚕到死丝方尽”的下一句是？", correct: "蜡炬成灰泪始干", distractors: ["春风吹又生", "月是故乡明", "一片冰心在玉壶"], note: "李商隐《无题》" },
  { q: "“此夜曲中闻折柳”的下一句是？", correct: "何人不起故园情", distractors: ["散入春风满洛城", "谁家玉笛暗飞声", "天涯共此时"], note: "李白《春夜洛城闻笛》· 洛阳" },
  { q: "“感时花溅泪”的下一句是？", correct: "恨别鸟惊心", distractors: ["城春草木深", "家书抵万金", "白头搔更短"], note: "杜甫《春望》" },
  { q: "“会当凌绝顶”的下一句是？", correct: "一览众山小", distractors: ["齐鲁青未了", "阴阳割昏晓", "决眦入归鸟"], note: "杜甫《望岳》· 巩义祖籍" },
  { q: "“洛阳亲友如相问”的下一句是？", correct: "一片冰心在玉壶", distractors: ["平明送客楚山孤", "寒雨连江夜入吴", "孤帆远影碧空尽"], note: "王昌龄《芙蓉楼送辛渐》· 洛阳" },
  { q: "“露从今夜白”的下一句是？", correct: "月是故乡明", distractors: ["边秋一雁声", "戍鼓断人行", "有弟皆分散"], note: "杜甫《月夜忆舍弟》· 故乡情怀" },
  { q: "“海上生明月”的下一句是？", correct: "天涯共此时", distractors: ["竟夕起相思", "披衣觉露滋", "还寝梦佳期"], note: "张九龄《望月怀远》" },
  { q: "“潮平两岸阔”的下一句是？", correct: "风正一帆悬", distractors: ["行舟绿水前", "江春入旧年", "归雁洛阳边"], note: "王湾《次北固山下》" },
  { q: "“野火烧不尽”的下一句是？", correct: "春风吹又生", distractors: ["一岁一枯荣", "萋萋满别情", "晴翠接荒城"], note: "白居易《赋得古原草送别》" },
  { q: "“沉舟侧畔千帆过”的下一句是？", correct: "病树前头万木春", distractors: ["二十三年弃置身", "到乡翻似烂柯人", "暂凭杯酒长精神"], note: "刘禹锡《酬乐天扬州初逢席上见赠》· 荥阳籍贯" },
  { q: "“衣带渐宽终不悔”的下一句是？", correct: "为伊消得人憔悴", distractors: ["望极春愁", "无言谁会凭阑意", "对酒当歌"], note: "柳永《蝶恋花》" },
  { q: "“相见时难别亦难”的下一句是？", correct: "东风无力百花残", distractors: ["春蚕到死丝方尽", "蜡炬成灰泪始干", "蓬山此去无多路"], note: "李商隐《无题》· 沁阳籍贯" }
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
    progress: 0,
    finished: false,
    percent: 0,
    verdict: "",
    best: 0
  },
  onLoad() {
    this.build();
  },
  build() {
    const qs = QUIZ.map(item => {
      const opts = shuffle(item.distractors.concat([item.correct]));
      return { q: item.q, opts, ans: opts.indexOf(item.correct), note: item.note };
    });
    this.setData({
      questions: shuffle(qs),
      cur: 0,
      answered: false,
      picked: -1,
      score: 0,
      correct: 0,
      total: qs.length,
      finished: false,
      percent: 0,
      verdict: "",
      best: wx.getStorageSync("quiz_best") || 0
    });
    this.updateProgress();
  },
  updateProgress() {
    const answered = this.data.answered ? 1 : 0;
    this.setData({ progress: Math.round((this.data.cur + answered) / this.data.total * 100) });
  },
  answer(e) {
    if (this.data.answered) return;
    const i = +e.currentTarget.dataset.index;
    const q = this.data.questions[this.data.cur];
    const right = i === q.ans;
    this.setData({
      answered: true,
      picked: i,
      score: this.data.score + (right ? 10 : 0),
      correct: this.data.correct + (right ? 1 : 0)
    });
    this.updateProgress();
  },
  next() {
    if (this.data.cur === this.data.total - 1) { this.finish(); return; }
    this.setData({ cur: this.data.cur + 1, answered: false, picked: -1 });
    this.updateProgress();
  },
  finish() {
    const total = this.data.total, correct = this.data.correct;
    const percent = Math.round(correct / total * 100);
    const score = this.data.score;
    const verdict =
      percent === 100 ? "诗仙之才！无一题能难倒你，妙极！" :
      percent >= 80 ? "诗圣风范！博闻强识，令人钦佩。" :
      percent >= 60 ? "当世诗人！功底扎实，再接再厉。" :
      "莫急，多读诗书、多游中原，再来闯关！";
    const best = Math.max(this.data.best || 0, score);
    wx.setStorageSync("quiz_best", best);
    const stat = wx.getStorageSync("quiz_stats") || { answered: 0, correct: 0 };
    stat.answered += total; stat.correct += correct;
    wx.setStorageSync("quiz_stats", stat);
    this.setData({ finished: true, percent, verdict, best });
  },
  restart() {
    this.build();
  }
});
