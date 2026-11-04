"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const files = [
  ["web/index.html", "index.html"],
  ["web/favicon.svg", "favicon.svg"],
  ["web/app.js", "app.js"],
  ["miniprogram/utils/core.js", "core.js"],
  ["miniprogram/utils/scene.js", "scene.js"],
  ["miniprogram/utils/physics.js", "physics.js"],
  ["miniprogram/utils/progress.js", "progress.js"],
  ["miniprogram/utils/audio.js", "audio.js"]
];

function copy(source, target) {
  const from = path.join(root, source);
  const to = path.join(output, target);
  if (!fs.existsSync(from)) throw new Error(`Missing build input: ${source}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function build() {
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  files.forEach(([source, target]) => copy(source, target));

  const version = Date.now().toString(36);
  const indexFile = path.join(output, "index.html");
  const html = fs.readFileSync(indexFile, "utf8").replace(
    /((?:src|href)=")(?!https?:|data:)([^"?#]+\.(?:js|svg))(?:\?[^"#]*)?(")/g,
    `$1$2?v=${version}$3`
  );
  fs.writeFileSync(indexFile, html, "utf8");

  const audioAssets = path.join(root, "miniprogram", "assets", "audio");
  for (const name of fs.readdirSync(audioAssets)) {
    if (!name.endsWith(".wav")) continue;
    copy(path.join("miniprogram", "assets", "audio", name), path.join("assets", "audio", name));
  }

  const built = fs.readdirSync(output, { recursive: true }).filter(name => fs.statSync(path.join(output, name)).isFile());
  console.log(`Built ${built.length} files in ${path.relative(root, output)}/`);
  return output;
}

if (require.main === module) build();

module.exports = { build, output };
