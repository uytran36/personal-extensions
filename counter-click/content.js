// content.js – Activity Tracker
// Theo dõi click chuột, phím bấm và từ đã gõ.
// Không thu thập dữ liệu từ password fields vì lý do bảo mật.

"use strict";

// ─── Pending batch (flush vào storage sau mỗi 1.5s) ──────────────────────────
let pending = newBatch();
let wordBuffer = "";
let isComposing = false; // true khi đang nhập IME (Telex, VNI…)
let flushTimer = null;

function newBatch() {
  return {
    leftClicks: 0,
    rightClicks: 0,
    middleClicks: 0,
    keystrokes: 0,
    scrollUp: 0,
    scrollDown: 0,
    keyFrequency: {},
    wordFrequency: {},
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function isPasswordField() {
  const el = document.activeElement;
  return el && el.tagName === "INPUT" && el.type === "password";
}

function addWord(raw) {
  // Xóa ký tự đặc biệt đầu/cuối, giữ nguyên chữ Unicode (tiếng Việt, v.v.)
  const word = raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}0-9]/gu, "");
  if (word.length >= 2) {
    pending.wordFrequency[word] = (pending.wordFrequency[word] || 0) + 1;
  }
}

function commitWord() {
  if (wordBuffer.length > 0) {
    addWord(wordBuffer);
    wordBuffer = "";
  }
}

// ─── Scroll tracking ─────────────────────────────────────────────────────────
// Throttle ở 100ms để tránh spam từ trackpad nhưng vẫn đếm từng notch chuột
let lastScrollTime = 0;
document.addEventListener(
  "wheel",
  (e) => {
    const now = Date.now();
    if (now - lastScrollTime < 100) return;
    lastScrollTime = now;
    if (e.deltaY < 0) pending.scrollUp++;
    else if (e.deltaY > 0) pending.scrollDown++;
    scheduleFlush();
  },
  { passive: true, capture: true },
);

// ─── Mouse tracking ───────────────────────────────────────────────────────────
document.addEventListener(
  "mousedown",
  (e) => {
    if (e.button === 0) pending.leftClicks++;
    else if (e.button === 2) pending.rightClicks++;
    else if (e.button === 1) pending.middleClicks++;
    scheduleFlush();
  },
  true,
);

// ─── IME composition (Telex / VNI tiếng Việt) ────────────────────────────────
document.addEventListener(
  "compositionstart",
  () => {
    isComposing = true;
  },
  true,
);

document.addEventListener(
  "compositionend",
  (e) => {
    isComposing = false;
    if (e.data) {
      // Có thể là nhiều từ trong một lần compose, ví dụ paste qua IME
      const parts = e.data.split(/\s+/);
      for (const part of parts) {
        addWord(part);
      }
      wordBuffer = "";
      scheduleFlush();
    }
  },
  true,
);

// ─── Keyboard tracking ────────────────────────────────────────────────────────
document.addEventListener(
  "keydown",
  (e) => {
    if (isPasswordField()) return; // Bảo mật: bỏ qua password field

    const key = e.key;
    pending.keystrokes++;

    // Thống kê tần suất phím (chữ cái thường hóa, phím đặc biệt giữ nguyên)
    const displayKey = key.length === 1 ? key.toLowerCase() : key;
    pending.keyFrequency[displayKey] =
      (pending.keyFrequency[displayKey] || 0) + 1;

    // Theo dõi từ chỉ khi không dùng IME
    if (!isComposing) {
      if (key.length === 1) {
        if (key === " ") {
          commitWord();
        } else {
          wordBuffer += key;
        }
      } else if (key === "Enter") {
        commitWord();
      } else if (key === "Backspace") {
        wordBuffer = wordBuffer.slice(0, -1);
      }
    }

    scheduleFlush();
  },
  true,
);

// ─── Flush vào storage ────────────────────────────────────────────────────────
function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flushToStorage, 500);
}

function flushToStorage() {
  const hasData =
    pending.leftClicks > 0 ||
    pending.rightClicks > 0 ||
    pending.middleClicks > 0 ||
    pending.keystrokes > 0 ||
    pending.scrollUp > 0 ||
    pending.scrollDown > 0;
  if (!hasData) return;

  const batch = {
    ...pending,
    keyFrequency: { ...pending.keyFrequency },
    wordFrequency: { ...pending.wordFrequency },
  };
  pending = newBatch();

  // Capture hour before async call
  const hour = new Date().getHours();

  chrome.storage.local.get(["stats"], (result) => {
    if (chrome.runtime.lastError) return;

    const stats = result.stats || defaultStats();
    stats.leftClicks += batch.leftClicks;
    stats.rightClicks += batch.rightClicks;
    stats.middleClicks += batch.middleClicks;
    stats.keystrokes += batch.keystrokes;
    stats.scrollUp = (stats.scrollUp || 0) + batch.scrollUp;
    stats.scrollDown = (stats.scrollDown || 0) + batch.scrollDown;

    // Hourly heatmap – tổng hoạt động trong giờ này
    if (!Array.isArray(stats.hourlyActivity)) {
      stats.hourlyActivity = new Array(24).fill(0);
    }
    stats.hourlyActivity[hour] +=
      batch.leftClicks +
      batch.rightClicks +
      batch.middleClicks +
      batch.keystrokes +
      batch.scrollUp +
      batch.scrollDown;

    for (const [k, v] of Object.entries(batch.keyFrequency)) {
      stats.keyFrequency[k] = (stats.keyFrequency[k] || 0) + v;
    }
    for (const [w, v] of Object.entries(batch.wordFrequency)) {
      stats.wordFrequency[w] = (stats.wordFrequency[w] || 0) + v;
      stats.words += v;
    }

    chrome.storage.local.set({ stats });
  });
}

function defaultStats() {
  return {
    leftClicks: 0,
    rightClicks: 0,
    middleClicks: 0,
    keystrokes: 0,
    words: 0,
    scrollUp: 0,
    scrollDown: 0,
    keyFrequency: {},
    wordFrequency: {},
    hourlyActivity: new Array(24).fill(0),
  };
}

// Flush lần cuối trước khi rời trang
window.addEventListener("beforeunload", () => {
  commitWord();
  flushToStorage();
});
