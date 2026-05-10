// background.js – Activity Tracker Service Worker

"use strict";

chrome.runtime.onInstalled.addListener(() => {
  initStorage();
  setActionIcon();
});

chrome.runtime.onStartup.addListener(() => {
  setActionIcon();
});

// ─── Storage initialization ───────────────────────────────────────────────────
function initStorage() {
  chrome.storage.local.get(["stats"], (result) => {
    if (!result.stats) {
      chrome.storage.local.set({ stats: defaultStats() });
    }
  });
}

function defaultStats() {
  return {
    leftClicks: 0,
    rightClicks: 0,
    middleClicks: 0,
    keystrokes: 0,
    words: 0,
    keyFrequency: {},
    wordFrequency: {},
  };
}

// ─── Dynamic icon (OffscreenCanvas) ──────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Nền gradient
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#4fc3f7");
  bg.addColorStop(1, "#7c3aed");
  roundRect(ctx, 0, 0, size, size, Math.max(3, size * 0.18));
  ctx.fillStyle = bg;
  ctx.fill();

  // Thân chuột (màu trắng)
  const mw = size * 0.46,
    mh = size * 0.6;
  const mx = (size - mw) / 2,
    my = (size - mh) / 2 + size * 0.02;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRect(ctx, mx, my, mw, mh, mw * 0.42);
  ctx.fill();

  // Đường phân chia nút chuột
  ctx.fillStyle = "rgba(100,80,200,0.30)";
  ctx.fillRect(size * 0.5 - 0.9, my + 1, 1.8, mh * 0.42);

  // Scroll wheel
  ctx.fillStyle = "rgba(80,60,180,0.70)";
  roundRect(
    ctx,
    size * 0.5 - size * 0.045,
    my + mh * 0.17,
    size * 0.09,
    mh * 0.24,
    size * 0.03,
  );
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function setActionIcon() {
  try {
    const imageData = {};
    for (const s of [16, 32, 48, 128]) {
      imageData[s] = drawIcon(s);
    }
    chrome.action.setIcon({ imageData });
  } catch (err) {
    // OffscreenCanvas không khả dụng, dùng icon mặc định
    console.warn("[ActivityTracker] Icon generation failed:", err);
  }
}
