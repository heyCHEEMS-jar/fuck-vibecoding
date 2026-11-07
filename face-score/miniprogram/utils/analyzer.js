"use strict";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function bandScore(value, goodLow, goodHigh, badLow, badHigh) {
  if (value >= goodLow && value <= goodHigh) return 100;
  if (value < goodLow) return clamp((value - badLow) / (goodLow - badLow) * 100);
  return clamp((badHigh - value) / (badHigh - goodHigh) * 100);
}

function regionMoments(luminance, data, width, height, x1, y1, x2, y2, step) {
  let brightness = 0;
  let brightnessSquare = 0;
  let saturation = 0;
  let count = 0;
  for (let y = Math.floor(height * y1); y < height * y2; y += step) {
    for (let x = Math.floor(width * x1); x < width * x2; x += step) {
      const pixel = y * width + x;
      const i = pixel * 4;
      const value = luminance[pixel];
      brightness += value;
      brightnessSquare += value * value;
      saturation += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
      count += 1;
    }
  }
  const mean = brightness / Math.max(1, count);
  return {
    mean,
    contrast: Math.sqrt(Math.max(0, brightnessSquare / Math.max(1, count) - mean * mean)),
    saturation: saturation / Math.max(1, count)
  };
}

function detailSharpness(luminance, width, height, step) {
  const edges = [];
  const left = Math.floor(width * 0.2);
  const right = Math.ceil(width * 0.8);
  const top = Math.floor(height * 0.1);
  const bottom = Math.ceil(height * 0.82);
  for (let y = Math.max(step, top); y < Math.min(height - step, bottom); y += step) {
    for (let x = Math.max(step, left); x < Math.min(width - step, right); x += step) {
      const i = y * width + x;
      edges.push(Math.abs(luminance[i] * 4 - luminance[i - step] - luminance[i + step] - luminance[i - step * width] - luminance[i + step * width]));
    }
  }
  edges.sort((a, b) => a - b);
  return average(edges.slice(Math.floor(edges.length * 0.68)));
}

function backgroundStats(data, width, height, step) {
  const samples = [];
  let r = 0;
  let g = 0;
  let b = 0;
  for (let y = 0; y < height * 0.62; y += step) {
    for (let x = 0; x < width; x += step) {
      if (y > height * 0.13 && x > width * 0.16 && x < width * 0.84) continue;
      const i = (y * width + x) * 4;
      const color = [data[i], data[i + 1], data[i + 2]];
      samples.push(color);
      r += color[0];
      g += color[1];
      b += color[2];
    }
  }
  const count = Math.max(1, samples.length);
  const mean = { r: r / count, g: g / count, b: b / count };
  const deviation = average(samples.map(color => Math.sqrt(
    ((color[0] - mean.r) ** 2 + (color[1] - mean.g) ** 2 + (color[2] - mean.b) ** 2) / 3
  )));
  return { mean, deviation };
}

function subjectStats(data, width, height, step, background) {
  const threshold = Math.max(20, background.deviation * 2.2);
  let count = 0;
  let sumX = 0;
  let minX = width;
  let maxX = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const distance = Math.sqrt(
        ((data[i] - background.mean.r) ** 2 + (data[i + 1] - background.mean.g) ** 2 + (data[i + 2] - background.mean.b) ** 2) / 3
      );
      if (distance <= threshold) continue;
      count += 1;
      sumX += x;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  const total = Math.ceil(width / step) * Math.ceil(height / step);
  const coverage = count / Math.max(1, total);
  const reliable = coverage > 0.08 && coverage < 0.82;
  return {
    reliable,
    coverage,
    centerX: reliable ? sumX / count / width : 0.5,
    widthRatio: reliable ? (maxX - minX) / width : 0.58
  };
}

function metrics(imageData, originalWidth, originalHeight) {
  const { data, width, height } = imageData;
  const luminance = new Float32Array(width * height);
  for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
    luminance[pixel] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  const step = Math.max(1, Math.floor(Math.min(width, height) / 180));
  const center = regionMoments(luminance, data, width, height, 0.2, 0.08, 0.8, 0.82, step);
  const left = regionMoments(luminance, data, width, height, 0.2, 0.14, 0.48, 0.76, step).mean;
  const right = regionMoments(luminance, data, width, height, 0.52, 0.14, 0.8, 0.76, step).mean;
  const background = backgroundStats(data, width, height, step);
  const subject = subjectStats(data, width, height, step, background);

  return {
    centerBrightness: center.mean,
    centerContrast: center.contrast,
    centerSaturation: center.saturation,
    sharpness: detailSharpness(luminance, width, height, step),
    lightGap: Math.abs(left - right),
    backgroundDeviation: background.deviation,
    subject,
    portraitRatio: originalHeight / Math.max(1, originalWidth),
    megapixels: originalWidth * originalHeight / 1000000
  };
}

function clarityScore(sharpness) {
  return clamp(56 + Math.sqrt(Math.max(0, sharpness)) * 8.5);
}

function centeringScore(subject) {
  if (!subject.reliable) return 84;
  const center = clamp(100 - Math.max(0, Math.abs(subject.centerX - 0.5) - 0.025) * 260);
  const width = bandScore(subject.widthRatio, 0.34, 0.88, 0.12, 1);
  return center * 0.72 + width * 0.28;
}

function penalty(value, safe, max) {
  return value >= safe ? 0 : Math.min(max, (safe - value) / Math.max(1, safe - 20) * max);
}

function item(label, score, good, bad) {
  const value = Math.round(clamp(score));
  return { label, score: value, text: value >= 72 ? good : bad };
}

function beautyResult(values) {
  const exposure = bandScore(values.centerBrightness, 82, 218, 28, 252);
  const clarity = clarityScore(values.sharpness);
  const balance = clamp(100 - Math.max(0, values.lightGap - 10) * 2.3);
  const contrast = bandScore(values.centerContrast, 18, 86, 2, 125);
  const color = values.centerSaturation > 130 ? clamp(100 - (values.centerSaturation - 130) * 1.5) : clamp(82 + values.centerSaturation * 0.25);
  const composition = centeringScore(values.subject);
  const quality = exposure * 0.23 + clarity * 0.25 + balance * 0.17 + contrast * 0.12 + color * 0.08 + composition * 0.15;
  const score = Math.round(clamp(63 + quality * 0.35, 63, 97));
  const details = [
    item("光线状态", exposure * 0.65 + balance * 0.35, "受光比较自然", "光线会影响这张照片的上镜感"),
    item("清晰表现", clarity, "主体细节比较清楚", "清晰度拖了照片后腿"),
    item("画面层次", contrast * 0.7 + color * 0.3, "明暗和颜色比较舒服", "画面层次稍显平淡或过重"),
    item("主体构图", composition, "主体位置比较舒服", "调整人物位置会更出片")
  ];
  const weakest = details.slice().sort((a, b) => a.score - b.score)[0];
  return {
    mode: "beauty",
    score,
    title: score >= 92 ? "这张很能打" : score >= 86 ? "镜头挺偏心" : score >= 78 ? "状态不错" : "调整一下会更出片",
    summary: weakest.score >= 76 ? "照片整体状态稳定，没有明显短板" : weakest.text,
    details,
    disclaimer: "这是照片上镜娱乐分，只衡量光线、清晰度、色彩和构图，不评价真实长相。"
  };
}

function idPhotoResult(values) {
  const exposure = bandScore(values.centerBrightness, 92, 222, 42, 250);
  const clarity = clarityScore(values.sharpness);
  const background = clamp(103 - Math.max(0, values.backgroundDeviation - 2) * 1.65);
  const balance = clamp(100 - Math.max(0, values.lightGap - 9) * 2.15);
  const portrait = bandScore(values.portraitRatio, 1.08, 1.78, 0.72, 2.3);
  const resolution = clamp(52 + Math.sqrt(Math.max(0, values.megapixels)) * 58);
  const centering = centeringScore(values.subject);

  let score = 96;
  score -= penalty(clarity, 72, 17);
  score -= penalty(exposure, 72, 13);
  score -= penalty(background, 66, 11);
  score -= penalty(balance, 66, 8);
  score -= penalty(portrait, 62, 7);
  score -= penalty(centering, 66, 9);
  score -= penalty(resolution, 58, 7);
  score = Math.round(clamp(score, 38, 97));

  const details = [
    item("照片清晰度", clarity, "主体细节达到基础使用要求", "照片偏糊，建议重新拍摄"),
    item("曝光", exposure, "主体亮度处于宽容区间", values.centerBrightness < 92 ? "主体偏暗" : "主体高光偏亮"),
    item("背景均匀度", background, "背景整体较均匀", "背景存在明显阴影或杂色"),
    item("左右受光", balance, "左右明暗差在可接受范围", "左右明暗差较大"),
    item("主体构图", centering, "主体位置较为居中", "主体位置或占比需要调整")
  ];
  const weakest = details.slice().sort((a, b) => a.score - b.score)[0];
  return {
    mode: "idPhoto",
    score,
    title: score >= 92 ? "基础质量很好" : score >= 84 ? "整体符合常规拍摄要求" : score >= 72 ? "有一两处可以调整" : "建议重新拍一张",
    summary: weakest.score >= 72 ? "未发现明显的拍摄质量问题" : weakest.text,
    details,
    disclaimer: "结果仅检查整张照片的拍摄质量与基础构图；未使用人脸模型，不代表公安、签证或考试机构的正式审核结论。"
  };
}

function analyze(mode, imageData, originalWidth, originalHeight) {
  const values = metrics(imageData, originalWidth, originalHeight);
  return mode === "idPhoto" ? idPhotoResult(values) : beautyResult(values);
}

module.exports = { analyze };
