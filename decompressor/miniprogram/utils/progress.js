(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorryProgress = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORAGE_KEY = "worry-recycler-progress-v1";
  const MAX_DATES = 370;
  const UNLOCKS = Object.freeze([
    { days: 2, label: "新损话" },
    { days: 4, label: "系统发疯卡面" },
    { days: 7, label: "工位幸存章" }
  ]);

  function chinaDate(now = Date.now()) {
    const value = Number.isFinite(now) ? now : Date.now();
    return new Date(value + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  function normalize(value) {
    let source = value;
    if (typeof source === "string") {
      try { source = JSON.parse(source); } catch (_) { source = {}; }
    }
    if (!source || typeof source !== "object") source = {};
    const dates = Array.isArray(source.dates)
      ? [...new Set(source.dates.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item)))].slice(-MAX_DATES)
      : [];
    const storedTotal = Number.isInteger(source.totalDays) && source.totalDays >= 0 ? source.totalDays : 0;
    return { totalDays: Math.max(storedTotal, dates.length), dates, added: false, today: "" };
  }

  function complete(value, now = Date.now()) {
    const progress = normalize(value);
    const today = chinaDate(now);
    const added = !progress.dates.includes(today);
    const dates = added ? progress.dates.concat(today).slice(-MAX_DATES) : progress.dates;
    return {
      totalDays: progress.totalDays + (added ? 1 : 0),
      dates,
      added,
      today
    };
  }

  function nextUnlock(totalDays) {
    const days = Number.isFinite(totalDays) ? Math.max(0, Math.floor(totalDays)) : 0;
    return UNLOCKS.find(item => item.days > days) || null;
  }

  function cardTier(totalDays) {
    const days = Number.isFinite(totalDays) ? Math.max(0, Math.floor(totalDays)) : 0;
    return days >= 7 ? 3 : days >= 4 ? 2 : days >= 2 ? 1 : 0;
  }

  function summary(totalDays) {
    const days = Number.isFinite(totalDays) ? Math.max(0, Math.floor(totalDays)) : 0;
    const next = nextUnlock(days);
    return next
      ? `已放过自己 ${days} 天 · 再撑 ${next.days - days} 天解锁${next.label}`
      : `已放过自己 ${days} 天 · 工位幸存章已到手`;
  }

  function storedValue(value) {
    const progress = normalize(value);
    return { totalDays: progress.totalDays, dates: progress.dates };
  }

  return { STORAGE_KEY, UNLOCKS, chinaDate, normalize, complete, nextUnlock, cardTier, summary, storedValue };
});
