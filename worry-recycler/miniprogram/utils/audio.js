(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorryAudio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SOUNDS = Object.freeze({
    ui: Object.freeze(["ui-1.wav", "ui-2.wav", "ui-3.wav"]),
    paper: Object.freeze(["paper-1.wav", "paper-2.wav", "paper-3.wav"]),
    seal: Object.freeze(["seal-1.wav", "seal-2.wav"]),
    tap: Object.freeze(["tap-1.wav", "tap-2.wav", "tap-3.wav", "tap-4.wav"]),
    light: Object.freeze(["impact-light-1.wav", "impact-light-2.wav", "impact-light-3.wav"]),
    medium: Object.freeze(["impact-medium-1.wav", "impact-medium-2.wav", "impact-medium-3.wav"]),
    heavy: Object.freeze(["impact-heavy-1.wav", "impact-heavy-2.wav", "impact-heavy-3.wav"]),
    final: Object.freeze(["final-1.wav", "final-2.wav"]),
    recycle: Object.freeze(["recycle-1.wav", "recycle-2.wav"]),
    door: Object.freeze(["door-1.wav", "door-2.wav", "door-3.wav"])
  });

  const VOLUME = Object.freeze({
    ui: 0.34, paper: 0.38, seal: 0.46, tap: 0.58,
    light: 0.72, medium: 0.86, heavy: 0.98, final: 0.84, recycle: 0.52, door: 1
  });

  function createPlayer(createAudio, rootPath = "assets/audio/") {
    const cache = new Map();
    const last = new Map();

    function choose(kind) {
      const files = SOUNDS[kind];
      if (!files || !files.length) return null;
      let index = Math.floor(Math.random() * files.length);
      if (files.length > 1 && index === last.get(kind)) index = (index + 1) % files.length;
      last.set(kind, index);
      return files[index];
    }

    function play(kind) {
      try {
        const file = choose(kind);
        if (!file) return;
        const path = rootPath + file;
        let audio = cache.get(path);
        if (!audio) {
          audio = createAudio(path, VOLUME[kind] || 0.6);
          if (!audio) return;
          cache.set(path, audio);
        }
        audio.play();
      } catch (_) {}
    }

    function destroy() {
      cache.forEach(audio => {
        try { if (audio.destroy) audio.destroy(); } catch (_) {}
      });
      cache.clear();
    }

    return { play, destroy };
  }

  return { SOUNDS, createPlayer };
});
