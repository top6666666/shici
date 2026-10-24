// 路线探索 · 诗词护照（与"首站打卡"联动：打卡对应点位解锁诗旅路线）
const ROUTES = [
  { id: 1, type: "自驾", name: "唐诗之路文化自驾环线", points: "巩义 → 荥阳 → 洛阳 → 开封", desc: "3—5天，深度文化体验与全程导览", pids: [1, 2, 6, 4] },
  { id: 2, type: "骑行", name: "溯源生态骑行路线", points: "淇河 → 新郑 → 许昌", desc: "2—3天，运动 + 文化的轻旅行模式", pids: [3, 5] },
  { id: 3, type: "城市漫步", name: "郑州古诗词城市微旅行", points: "郑州古城街区", desc: "2—3小时，AR解谜与非遗体验", pids: [5] },
  { id: 4, type: "研学", name: "跟着《诗经》游河南·中原诗词文旅研学路线", points: "郑州·新郑 → 鹤壁·安阳 → 洛阳 → 淮阳 → 荥阳", desc: "5天，以《诗经》河南五国风为主线的沉浸式研学", pids: [5, 3, 6] }
];
const PNAME = { 1: "杜甫故里", 2: "李商隐公园", 3: "淇河湿地", 4: "禹王台", 5: "溱洧湿地", 6: "龙门石窟" };
const STAMP_KEY = "passport_stamped";

Page({
  data: {
    routes: [],
    totalUnlocked: 0,
    total: 0,
    percent: 0
  },
  onShow() {
    this.load();
  },
  load() {
    const saved = wx.getStorageSync(STAMP_KEY) || [];
    const set = new Set(saved.map(String));
    const routes = ROUTES.map(r => {
      const total = r.pids.length;
      const explored = r.pids.filter(id => set.has(String(id))).length;
      const unlocked = explored > 0;
      return {
        ...r,
        total,
        explored,
        percent: total ? Math.round(explored / total * 100) : 0,
        unlocked,
        ptsText: r.pids.map(id => PNAME[id] || "").join("、")
      };
    });
    const totalUnlocked = routes.filter(r => r.unlocked).length;
    this.setData({
      routes,
      totalUnlocked,
      total: routes.length,
      percent: routes.length ? Math.round(totalUnlocked / routes.length * 100) : 0
    });
  },
  open(e) {
    const id = e.currentTarget.dataset.id;
    const r = this.data.routes.find(x => x.id === id);
    if (!r) return;
    if (r.unlocked) {
      wx.navigateTo({ url: "/pages/route-detail/route-detail?id=" + id });
    } else {
      wx.showModal({
        title: "路线未解锁",
        content: "先到文化点位打卡（" + r.ptsText + "），即可解锁此诗旅路线。",
        confirmText: "去打卡",
        cancelText: "再想想",
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: "/pages/stamp/stamp" });
        }
      });
    }
  },
  goStamp() {
    wx.navigateTo({ url: "/pages/stamp/stamp" });
  }
});
