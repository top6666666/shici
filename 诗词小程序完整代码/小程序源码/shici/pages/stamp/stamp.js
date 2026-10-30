// 首站打卡 · 诗词护照
// 基于 app.globalData.points 的 6 个河南文化点位，支持打卡盖章、查看关联诗词，进度本地持久化
const REPRESENT = {
  1: "国破山河在，城春草木深",
  2: "此情可待成追忆，只是当时已惘然",
  3: "瞻彼淇奥，绿竹猗猗",
  4: "登台放歌，三贤曾驻留，汴水诗意长",
  5: "溱与洧，方涣涣兮，士与女，方秉蕑兮",
  6: "伊河之畔，佛光与诗意共千年"
};
const STAMP_KEY = "passport_stamped";

Page({
  data: {
    points: [],
    total: 0,
    stampedCount: 0,
    percent: 0,
    focus: ""
  },
  onLoad(options) {
    if (options && options.focus) this.setData({ focus: String(options.focus) });
  },
  onReady() {
    if (this.data.focus) this.scrollToFocus();
  },
  scrollToFocus() {
    const id = this.data.focus;
    wx.createSelectorQuery()
      .select(".container").boundingClientRect(c => {
        wx.createSelectorQuery().select("#pt-" + id).boundingClientRect(r => {
          if (c && r) wx.pageScrollTo({ scrollTop: Math.max(0, r.top - c.top - 100), duration: 300 });
        }).exec();
      }).exec();
  },
  onShow() {
    this.load();
  },
  load() {
    const app = getApp();
    const pts = (app.globalData.points || []).map(p => ({ ...p, stamped: false }));
    const saved = wx.getStorageSync(STAMP_KEY) || [];
    const set = new Set(saved.map(String));
    pts.forEach(p => { p.stamped = set.has(String(p.id)); });
    const stampedCount = pts.filter(p => p.stamped).length;
    const total = pts.length;
    this.setData({
      points: pts,
      total,
      stampedCount,
      percent: total ? Math.round(stampedCount / total * 100) : 0
    });
  },
  represent(id) {
    return REPRESENT[id] || "";
  },
  stamp(e) {
    const id = e.currentTarget.dataset.id;
    const pt = this.data.points.find(x => String(x.id) === String(id));
    if (!pt) return;
    const line = this.represent(id);
    if (pt.stamped) {
      wx.showModal({
        title: pt.name,
        content: "【" + pt.city + "】" + pt.poem + "\n“" + line + "”\n已盖章，可再前往点位重温。",
        showCancel: false,
        confirmText: "知道了"
      });
      return;
    }
    wx.showModal({
      title: "打卡 " + pt.name,
      content: "【" + pt.city + "】" + pt.poem + "\n“" + line + "”\n确认在此盖下第一枚印章吗？",
      confirmText: "打卡",
      cancelText: "再想想",
      success: (r) => {
        if (r.confirm) this.doStamp(id);
      }
    });
  },
  doStamp(id) {
    const saved = wx.getStorageSync(STAMP_KEY) || [];
    if (saved.indexOf(id) === -1) saved.push(id);
    wx.setStorageSync(STAMP_KEY, saved);
    const pts = this.data.points.map(p => (String(p.id) === String(id) ? { ...p, stamped: true } : p));
    const stampedCount = pts.filter(p => p.stamped).length;
    this.setData({
      points: pts,
      stampedCount,
      percent: this.data.total ? Math.round(stampedCount / this.data.total * 100) : 0
    });
    const pt = pts.find(p => String(p.id) === String(id));
    wx.showToast({ title: "盖章成功 · " + pt.name, icon: "none", duration: 1600 });
  },
  reset() {
    wx.showModal({
      title: "重置护照",
      content: "将清空全部打卡记录，确定吗？",
      confirmText: "重置",
      cancelText: "取消",
      success: (r) => {
        if (r.confirm) {
          wx.removeStorageSync(STAMP_KEY);
          this.setData({
            points: this.data.points.map(p => ({ ...p, stamped: false })),
            stampedCount: 0,
            percent: 0
          });
          wx.showToast({ title: "已重置打卡记录", icon: "none" });
        }
      }
    });
  }
});
