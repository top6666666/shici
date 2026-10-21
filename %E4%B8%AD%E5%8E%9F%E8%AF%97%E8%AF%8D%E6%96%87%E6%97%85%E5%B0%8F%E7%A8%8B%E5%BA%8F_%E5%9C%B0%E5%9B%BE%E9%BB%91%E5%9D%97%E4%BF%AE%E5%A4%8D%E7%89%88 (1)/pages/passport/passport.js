// 诗词护照 · 成就总览页（联动首站打卡 / 诗句答对 / 路线探索）
const { getSummary } = require("../../utils/passport.js");

Page({
  data: {
    stampedCount: 0, totalPoints: 6,
    quizBest: 0, quizAnswered: 0, quizCorrect: 0,
    unlockedRoutes: 0, totalRoutes: 4,
    points: 0, levelName: "", nextName: null, nextNeed: 0, levelProgress: 0,
    stampPct: 0, quizPct: 0, routePct: 0,
    litCount: 0, badges: []
  },
  onShow() {
    this.setData(getSummary());
  },
  goStamp() { wx.navigateTo({ url: "/pages/stamp/stamp" }); },
  goQuiz() { wx.navigateTo({ url: "/pages/quiz/quiz" }); },
  goRoute() { wx.navigateTo({ url: "/pages/route-explore/route-explore" }); }
});
