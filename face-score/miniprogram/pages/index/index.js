const Analyzer = require("../../utils/analyzer");

const FREE_ANALYSIS_KEY = "face-score-free-analysis-used-v1";

Page({
  data: {
    stage: "home",
    mode: "",
    modeLabel: "",
    statusNumber: "01",
    statusTitle: "准备分析",
    statusCopy: "照片不会离开当前设备",
    result: null,
    rankings: [],
    showPrivacy: false
  },

  onLoad() {
    this.selectedPaths = [];
    this.analysisCanvas = null;
    this.analysisContext = null;
    this.rewardedVideoAd = null;
    this.adCloseHandler = null;
    this.adErrorHandler = null;
    try { this.hasUsedFreeAnalysis = Boolean(wx.getStorageSync(FREE_ANALYSIS_KEY)); } catch (_) { this.hasUsedFreeAnalysis = false; }
    this.setupRewardedVideoAd();
  },

  onReady() {
    this.prepareCanvas();
  },

  onUnload() {
    this.releasePhotos();
    this.destroyRewardedVideoAd();
  },

  prepareCanvas() {
    return new Promise((resolve, reject) => {
      if (this.analysisCanvas) return resolve(this.analysisCanvas);
      wx.createSelectorQuery().in(this).select("#analysisCanvas").fields({ node: true, size: true }).exec(results => {
        const canvas = results[0] && results[0].node;
        if (!canvas) return reject(new Error("画布初始化失败"));
        this.analysisCanvas = canvas;
        this.analysisContext = canvas.getContext("2d");
        resolve(canvas);
      });
    });
  },

  setupRewardedVideoAd() {
    const app = getApp();
    const adUnitId = app && app.globalData && app.globalData.rewardedVideoAdUnitId;
    if (!adUnitId || !wx.createRewardedVideoAd) return;
    try {
      const ad = wx.createRewardedVideoAd({ adUnitId });
      this.rewardedVideoAd = ad;
      this.adCloseHandler = result => {
        const resolve = this.adResolve;
        this.adResolve = null;
        if (resolve) resolve(!result || result.isEnded);
      };
      this.adErrorHandler = () => {
        const resolve = this.adResolve;
        this.adResolve = null;
        if (resolve) resolve(null);
      };
      ad.onClose(this.adCloseHandler);
      ad.onError(this.adErrorHandler);
    } catch (_) {}
  },

  destroyRewardedVideoAd() {
    const ad = this.rewardedVideoAd;
    if (!ad) return;
    try {
      if (ad.offClose && this.adCloseHandler) ad.offClose(this.adCloseHandler);
      if (ad.offError && this.adErrorHandler) ad.offError(this.adErrorHandler);
      if (ad.destroy) ad.destroy();
    } catch (_) {}
    this.rewardedVideoAd = null;
  },

  async choosePhotos(event) {
    const mode = event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.mode || this.data.mode;
    if (!mode) return;
    let chosen;
    try {
      chosen = await wx.chooseMedia({
        count: mode === "compare" ? 3 : 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        sizeType: ["compressed"]
      });
    } catch (_) {
      return;
    }

    const paths = (chosen.tempFiles || []).map(file => file.tempFilePath).filter(Boolean);
    if (mode === "compare" && paths.length < 2) {
      this.deletePaths(paths);
      wx.showToast({ title: "请一次选择 2～3 张照片", icon: "none" });
      return;
    }
    if (!paths.length) return;

    this.releasePhotos();
    this.selectedPaths = paths;
    const needsAd = Boolean(this.rewardedVideoAd) && (mode === "compare" || this.hasUsedFreeAnalysis);
    this.setData({
      mode,
      modeLabel: mode === "idPhoto" ? "证件照质量" : "上镜对比",
      stage: "waiting",
      result: null,
      rankings: [],
      statusNumber: "01",
      statusTitle: mode === "compare" ? `已选择 ${paths.length} 张照片` : "照片已选好",
      statusCopy: needsAd ? "完整观看广告后开始本地分析" : mode === "compare" ? "广告暂未配置，直接开始本地对比" : "首次免费，马上在本机开始分析"
    });
    await this.startAnalysis(needsAd);
  },

  async startAnalysis(needsAd) {
    if (needsAd) {
      const watched = await this.showRewardedVideo();
      if (watched === false) {
        this.releasePhotos();
        this.setData({ stage: "home", mode: "", modeLabel: "", result: null, rankings: [] });
        wx.showToast({ title: "完整观看后才能继续分析", icon: "none" });
        return;
      }
      if (watched === null) wx.showToast({ title: "广告暂不可用，直接开始分析", icon: "none" });
    }
    await this.runAnalysis();
  },

  showRewardedVideo() {
    const ad = this.rewardedVideoAd;
    if (!ad) return Promise.resolve(null);
    return new Promise(resolve => {
      this.adResolve = resolve;
      ad.show().catch(() => ad.load().then(() => ad.show())).catch(() => {
        if (this.adResolve) this.adResolve(null);
        this.adResolve = null;
      });
    });
  },

  async runAnalysis() {
    if (!this.selectedPaths.length) return;
    const mode = this.data.mode;
    const results = [];
    try {
      for (let i = 0; i < this.selectedPaths.length; i += 1) {
        this.setData({
          statusNumber: String(i + 2).padStart(2, "0"),
          statusTitle: mode === "compare" ? `正在分析第 ${i + 1} 张` : "本地分析中",
          statusCopy: "正在检查光线、清晰度、色彩与构图"
        });
        const result = await this.analyzePhoto(this.selectedPaths[i], mode);
        results.push({ ...result, path: this.selectedPaths[i], sourceIndex: i + 1 });
      }

      if (mode === "compare") this.showComparison(results);
      else this.setData({ stage: "result", result: results[0], rankings: [] });

      if (mode !== "compare" && !this.hasUsedFreeAnalysis) {
        this.hasUsedFreeAnalysis = true;
        try { wx.setStorageSync(FREE_ANALYSIS_KEY, true); } catch (_) {}
      }
    } catch (_) {
      this.releasePhotos();
      this.setData({ stage: "home", mode: "", modeLabel: "", result: null, rankings: [] });
      wx.showToast({ title: "有照片暂时无法分析", icon: "none" });
    }
  },

  async analyzePhoto(path, mode) {
    const info = await wx.getImageInfo({ src: path });
    const canvas = await this.prepareCanvas();
    const maxSide = 420;
    const scale = Math.min(1, maxSide / Math.max(info.width, info.height));
    const width = Math.max(1, Math.round(info.width * scale));
    const height = Math.max(1, Math.round(info.height * scale));
    canvas.width = width;
    canvas.height = height;
    const image = canvas.createImage();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = path;
    });
    this.analysisContext.clearRect(0, 0, width, height);
    this.analysisContext.drawImage(image, 0, 0, width, height);
    const imageData = this.analysisContext.getImageData(0, 0, width, height);
    const result = Analyzer.analyze(mode, imageData, info.width, info.height);
    this.analysisContext.clearRect(0, 0, width, height);
    canvas.width = 1;
    canvas.height = 1;
    return result;
  },

  showComparison(results) {
    const rankings = results.slice().sort((a, b) => b.score - a.score).map((result, index) => ({
      ...result,
      rank: index + 1,
      best: index === 0
    }));
    const best = rankings[0];
    const gap = best.score - rankings[1].score;
    const result = {
      ...best,
      title: `第 ${best.sourceIndex} 张更上镜`,
      summary: gap <= 2 ? "前两张非常接近，这张的整体状态略胜一筹" : `比第二名高 ${gap} 分，光线与构图更稳定`,
      disclaimer: "排名只比较这些照片的光线、清晰度、色彩和构图，不比较照片中人物的真实长相。"
    };
    this.setData({ stage: "result", result, rankings });
  },

  releasePhotos() {
    this.deletePaths(this.selectedPaths);
    this.selectedPaths = [];
    if (!this.analysisCanvas || !this.analysisContext) return;
    try {
      this.analysisContext.clearRect(0, 0, this.analysisCanvas.width, this.analysisCanvas.height);
      this.analysisCanvas.width = 1;
      this.analysisCanvas.height = 1;
    } catch (_) {}
  },

  deletePaths(paths) {
    if (!paths || !paths.length || !wx.getFileSystemManager) return;
    const files = wx.getFileSystemManager();
    paths.forEach(path => {
      try { files.unlink({ filePath: path, fail() {} }); } catch (_) {}
    });
  },

  chooseAgain() {
    this.choosePhotos({ currentTarget: { dataset: { mode: this.data.mode } } });
  },

  backHome() {
    this.releasePhotos();
    this.setData({ stage: "home", mode: "", modeLabel: "", result: null, rankings: [] });
  },

  openPrivacy() {
    this.setData({ showPrivacy: true });
  },

  closePrivacy() {
    this.setData({ showPrivacy: false });
  },

  preventDefault() {},

  onShareAppMessage() {
    const result = this.data.result;
    return {
      title: result ? `${this.data.modeLabel}｜${result.title}` : "哪张更上镜？证件照能用吗？",
      path: "/pages/index/index"
    };
  }
});
