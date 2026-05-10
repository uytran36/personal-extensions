// popup.js – Activity Tracker

"use strict";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n || 0);
}

function pct(part, total) {
  if (!total) return "–";
  return ((part / total) * 100).toFixed(1) + "%";
}

// ─── Render bar list ──────────────────────────────────────────────────────────
function renderBarList(containerId, freq) {
  const el = document.getElementById(containerId);
  if (!freq || Object.keys(freq).length === 0) {
    el.innerHTML = '<p class="empty-msg">Chưa có dữ liệu</p>';
    return;
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const max = sorted[0][1];
  const medals = ["🥇", "🥈", "🥉", "4", "5"];

  el.innerHTML = sorted
    .map(
      ([label, count], i) => `
    <div class="bar-item${i === 0 ? " top-1" : ""}">
      <span class="bar-rank">${medals[i]}</span>
      <span class="bar-label" title="${escHtml(label)}">${escHtml(label)}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${((count / max) * 100).toFixed(1)}%"></div>
      </div>
      <span class="bar-count">${fmt(count)}</span>
    </div>
  `,
    )
    .join("");
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Render heatmap ─────────────────────────────────────────────────────────
function renderHeatmap(hourlyActivity) {
  const grid = document.getElementById("heatmap-grid");
  const peakEl = document.getElementById("heatmap-peak");

  const data = Array.isArray(hourlyActivity)
    ? hourlyActivity
    : new Array(24).fill(0);
  const max = Math.max(...data, 1);
  const peakHour = data.indexOf(Math.max(...data));
  const total = data.reduce((a, b) => a + b, 0);

  grid.innerHTML = data
    .map((v, h) => {
      const ratio = v / max;
      let bg;
      if (v === 0) {
        bg = "#1a1a30";
      } else if (ratio >= 0.8) {
        // Peak hours: amber
        const alpha = (0.5 + ratio * 0.5).toFixed(2);
        bg = `rgba(251,191,36,${alpha})`;
      } else {
        // Normal: purple
        const alpha = (0.15 + ratio * 0.75).toFixed(2);
        bg = `rgba(167,139,250,${alpha})`;
      }
      const label = `${String(h).padStart(2, "0")}:00 – ${String(h + 1).padStart(2, "0")}:00\n${v.toLocaleString("vi-VN")} hoạt động`;
      return `<div class="heatmap-cell" style="background:${bg}" title="${escHtml(label)}"></div>`;
    })
    .join("");

  if (total > 0) {
    peakEl.innerHTML = `Giờ cao điểm: <strong>${String(peakHour).padStart(2, "0")}:00 – ${String(peakHour + 1).padStart(2, "0")}:00</strong> · ${fmt(data[peakHour])} hoạt động`;
  } else {
    peakEl.textContent = "";
  }
}

// ─── Render full UI ───────────────────────────────────────────────────────────
function renderUI(stats) {
  const s = stats || {};

  // Stat cards
  document.getElementById("left-clicks").textContent = fmt(s.leftClicks);
  document.getElementById("right-clicks").textContent = fmt(s.rightClicks);
  document.getElementById("keystrokes").textContent = fmt(s.keystrokes);
  document.getElementById("words").textContent = fmt(s.words);

  // Click distribution bar
  const total =
    (s.leftClicks || 0) + (s.middleClicks || 0) + (s.rightClicks || 0);
  if (total > 0) {
    const lp = ((s.leftClicks || 0) / total) * 100;
    const mp = ((s.middleClicks || 0) / total) * 100;
    const rp = ((s.rightClicks || 0) / total) * 100;
    document.getElementById("seg-left").style.width = lp + "%";
    document.getElementById("seg-middle").style.width = mp + "%";
    document.getElementById("seg-right").style.width = rp + "%";
    document.getElementById("pct-left").textContent = pct(s.leftClicks, total);
    document.getElementById("pct-right").textContent = pct(
      s.rightClicks,
      total,
    );
  } else {
    ["seg-left", "seg-middle", "seg-right"].forEach(
      (id) => (document.getElementById(id).style.width = "33.3%"),
    );
    document.getElementById("pct-left").textContent = "–";
    document.getElementById("pct-right").textContent = "–";
  }
  document.getElementById("mid-count").textContent = fmt(s.middleClicks);

  // Scroll stat cards
  document.getElementById("scroll-up").textContent = fmt(s.scrollUp);
  document.getElementById("scroll-down").textContent = fmt(s.scrollDown);

  // Scroll distribution bar
  const scrollTotal = (s.scrollUp || 0) + (s.scrollDown || 0);
  if (scrollTotal > 0) {
    document.getElementById("seg-scroll-up").style.width =
      ((s.scrollUp || 0) / scrollTotal) * 100 + "%";
    document.getElementById("seg-scroll-down").style.width =
      ((s.scrollDown || 0) / scrollTotal) * 100 + "%";
    document.getElementById("pct-scroll-up").textContent = pct(
      s.scrollUp,
      scrollTotal,
    );
    document.getElementById("pct-scroll-down").textContent = pct(
      s.scrollDown,
      scrollTotal,
    );
  } else {
    document.getElementById("seg-scroll-up").style.width = "50%";
    document.getElementById("seg-scroll-down").style.width = "50%";
    document.getElementById("pct-scroll-up").textContent = "–";
    document.getElementById("pct-scroll-down").textContent = "–";
  }

  // Heatmap
  renderHeatmap(s.hourlyActivity);
  // Bar lists
  renderBarList("top-keys", s.keyFrequency);
  renderBarList("top-words", s.wordFrequency);
}

// ─── Load stats ───────────────────────────────────────────────────────────────
chrome.storage.local.get(["stats"], (result) => {
  renderUI(result.stats);
});
// Live update khi content script ghi vào storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.stats) {
    renderUI(changes.stats.newValue);
  }
});
// ─── Export JSON ──────────────────────────────────────────────────────────────
document.getElementById("export-btn").addEventListener("click", () => {
  chrome.storage.local.get(["stats"], (result) => {
    const json = JSON.stringify(result.stats || {}, null, 2);
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

// ─── Reset data ───────────────────────────────────────────────────────────────
document.getElementById("reset-btn").addEventListener("click", () => {
  if (
    !confirm("Xóa toàn bộ dữ liệu thống kê? Hành động này không thể hoàn tác.")
  )
    return;

  const empty = {
    leftClicks: 0,
    rightClicks: 0,
    middleClicks: 0,
    keystrokes: 0,
    words: 0,
    keyFrequency: {},
    wordFrequency: {},
  };
  chrome.storage.local.set({ stats: empty }, () => renderUI(empty));
});
