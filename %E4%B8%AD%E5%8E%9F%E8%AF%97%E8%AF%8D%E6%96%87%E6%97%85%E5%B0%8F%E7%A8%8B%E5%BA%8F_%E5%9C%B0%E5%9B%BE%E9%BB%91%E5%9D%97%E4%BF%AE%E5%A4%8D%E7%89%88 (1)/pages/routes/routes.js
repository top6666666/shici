// 诗旅路线页 · 与文化点位联动（读打卡状态、显示进度、跳转打卡）
const POINT_NAMES = {
  1: "杜甫故里 · 巩义",
  2: "李商隐公园 · 荥阳",
  3: "淇河湿地 · 鹤壁",
  4: "禹王台 · 开封",
  5: "溱洧湿地 · 新郑",
  6: "龙门石窟 · 洛阳"
};
const ROUTES = [
  { id: 1, type: "自驾", name: "唐诗之路文化自驾环线", points: "巩义 → 荥阳 → 洛阳 → 开封", desc: "3—5天，深度文化体验与全程导览", pids: [1, 2, 6, 4] },
  { id: 2, type: "骑行", name: "溯源生态骑行路线", points: "淇河 → 新郑 → 许昌", desc: "2—3天，运动 + 文化的轻旅行模式", pids: [3, 5] },
  { id: 3, type: "城市漫步", name: "郑州古诗词城市微旅行", points: "郑州古城街区", desc: "2—3小时，AR解谜与非遗体验", pids: [5] },
  { id: 4, type: "研学", name: "跟着《诗经》游河南·中原诗词文旅研学路线", points: "郑州·新郑 → 鹤壁·安阳 → 洛阳 → 淮阳 → 荥阳", desc: "5天，以《诗经》河南五国风为主线的沉浸式研学", pids: [5, 3, 6] }
];

Page({
  data: { routes: [] },
  onShow() {
    const stamped = wx.getStorageSync("passport_stamped") || [];
    const set = new Set(stamped.map(String));
    const routes = ROUTES.map(r => {
      const pointsList = r.pids.map(id => ({
        id,
        name: POINT_NAMES[id] || ("文化点位" + id),
        stamped: set.has(String(id))
      }));
      const stampedCount = pointsList.filter(p => p.stamped).length;
      return { ...r, pointsList, stampedCount, total: r.pids.length };
    });
    this.setData({ routes });
  },
  tapPoint(e) {
    const id = String(e.currentTarget.dataset.id);
    const stamped = (wx.getStorageSync("passport_stamped") || []).map(String);
    if (stamped.indexOf(id) !== -1) { wx.showToast({ title: "该点位已打卡 ✓", icon: "none" }); return; }
    wx.navigateTo({ url: "/pages/stamp/stamp?focus=" + id });
  },
  open(e) { wx.navigateTo({ url: "/pages/route-detail/route-detail?id=" + e.currentTarget.dataset.id }); },
  goStamp() { wx.navigateTo({ url: "/pages/stamp/stamp" }); }
});
