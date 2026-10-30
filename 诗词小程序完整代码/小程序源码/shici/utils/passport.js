// 诗词护照 · 成就联动统一计算模块
// 汇总首站打卡 / 诗句答对 / 路线探索 三个板块的数据，计算积分、等级称号与成就勋章
const STAMP_KEY = "passport_stamped";
// 与 pages/route-explore、pages/routes 保持一致（路线关联点位）
const ROUTES = [
  { id: 1, pids: [1, 2, 6, 4] },
  { id: 2, pids: [3, 5] },
  { id: 3, pids: [5] },
  { id: 4, pids: [5, 3, 6] }
];
const POINT_TOTAL = 6;
const QUIZ_TOTAL = 120;
const ROUTE_TOTAL = ROUTES.length;

const LEVELS = [
  { min: 0, name: "诗坛新芽" },
  { min: 60, name: "中原游子" },
  { min: 120, name: "诗旅行者" },
  { min: 200, name: "诗史守护者" },
  { min: 300, name: "诗仙之魂" }
];

const BADGES = [
  { id: "stamp1", icon: "🏮", name: "首站启程", desc: "完成首次点位打卡", cond: s => s.stampedCount >= 1 },
  { id: "stamp6", icon: "🏮", name: "足迹遍中原", desc: "集齐全部 6 个点位印章", cond: s => s.stampedCount >= 6 },
  { id: "quiz1", icon: "📜", name: "初试锋芒", desc: "完成第一轮答题", cond: s => s.quizAnswered >= 1 },
  { id: "quizHigh", icon: "📜", name: "对答如流", desc: "单轮最高分达到 100 分", cond: s => s.quizBest >= 100 },
  { id: "quiz20", icon: "📜", name: "百炼成诗", desc: "累计答对 20 题", cond: s => s.quizCorrect >= 20 },
  { id: "route1", icon: "🗺️", name: "路线开拓者", desc: "解锁第 1 条诗旅路线", cond: s => s.unlockedRoutes >= 1 },
  { id: "routeDone", icon: "🗺️", name: "路线达人", desc: "完成全部 4 条路线的点位打卡", cond: s => s.completedRoutes >= 4 },
  { id: "routeAll", icon: "🗺️", name: "走遍河南", desc: "解锁全部 4 条路线", cond: s => s.unlockedRoutes >= 4 },
  { id: "all", icon: "🏆", name: "诗旅全才", desc: "打卡、答题、路线均有成就", cond: s => s.stampedCount >= 1 && s.quizAnswered >= 1 && s.unlockedRoutes >= 1 },
  { id: "master", icon: "👑", name: "诗旅大师", desc: "集齐全部点位与路线，且最高分 120", cond: s => s.stampedCount >= 6 && s.unlockedRoutes >= 4 && s.quizBest >= 120 }
];

function getSummary() {
  const stamped = wx.getStorageSync(STAMP_KEY) || [];
  const stampSet = new Set(stamped.map(String));
  const stampedCount = stamped.length;
  const quizBest = wx.getStorageSync("quiz_best") || 0;
  const quizStats = wx.getStorageSync("quiz_stats") || { answered: 0, correct: 0 };
  const unlockedRoutes = ROUTES.filter(r => r.pids.some(id => stampSet.has(String(id)))).length;
  const completedRoutes = ROUTES.filter(r => r.pids.every(id => stampSet.has(String(id)))).length;

  const points = stampedCount * 20 + quizStats.correct * 10 + unlockedRoutes * 30 + completedRoutes * 20;

  let level = LEVELS[0], next = null;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) { level = LEVELS[i]; next = LEVELS[i + 1] || null; break; }
  }

  const condArgs = {
    stampedCount,
    quizBest,
    quizAnswered: quizStats.answered,
    quizCorrect: quizStats.correct,
    unlockedRoutes,
    completedRoutes
  };

  const litCount = BADGES.filter(b => b.cond(condArgs)).length;
  const levelProgress = next ? Math.min(100, Math.round((points - level.min) / (next.min - level.min) * 100)) : 100;

  return {
    stampedCount,
    totalPoints: POINT_TOTAL,
    quizBest,
    quizAnswered: quizStats.answered,
    quizCorrect: quizStats.correct,
    unlockedRoutes,
    completedRoutes,
    totalRoutes: ROUTE_TOTAL,
    points,
    levelName: level.name,
    nextName: next ? next.name : null,
    nextNeed: next ? next.min - points : 0,
    levelProgress,
    stampPct: Math.round(stampedCount / POINT_TOTAL * 100),
    quizPct: Math.round(quizBest / QUIZ_TOTAL * 100),
    routePct: Math.round(unlockedRoutes / ROUTE_TOTAL * 100),
    completedRoutePct: Math.round(completedRoutes / ROUTE_TOTAL * 100),
    litCount,
    badges: BADGES.map(b => ({ id: b.id, icon: b.icon, name: b.name, desc: b.desc, lit: b.cond(condArgs) }))
  };
}

module.exports = { getSummary };
