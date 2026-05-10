// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = ["#60a5fa", "#fbbf24", "#34d399", "#f87171", "#a78bfa"];
const CANVAS_W = 652;
const CANVAS_H = 300;
const PAD = { left: 78, right: 18, top: 18, bottom: 46 };

// ─── State ────────────────────────────────────────────────────────────────────
let currentTab = "ram";
let rawStorage = {};
let chartData = { dates: [], series: [] };
let hoverIdx = -1; // hovered date index

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");
const legendEl = document.getElementById("legend");
const tooltip = document.getElementById("tooltip");
const statusMsg = document.getElementById("status-msg");
const statusUpd = document.getElementById("status-update");
const btnUpdate = document.getElementById("btn-update");

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadStorage() {
  return new Promise((resolve) =>
    chrome.storage.local.get(["ram", "ssd", "lastUpdate"], resolve),
  );
}

// ─── Data processing ──────────────────────────────────────────────────────────
/**
 * Transforms raw storage data for one category into chart-ready format.
 * rawData: { "YYYY-MM-DD": [{name, url, price}, ...], ... }
 * Returns:  { dates: string[], series: [{name, prices: (number|null)[], latestPrice}] }
 */
function processData(rawData) {
  if (!rawData || typeof rawData !== "object") return { dates: [], series: [] };

  const dates = Object.keys(rawData).sort();
  if (dates.length === 0) return { dates: [], series: [] };

  // Build map: slug → { name, prices: {date: price} }
  const map = new Map();
  for (const date of dates) {
    const dayList = rawData[date] || [];
    for (const p of dayList) {
      const slug = p.url.split("/products/")[1] || p.url;
      if (!map.has(slug)) map.set(slug, { name: p.name, priceByDate: {} });
      map.get(slug).priceByDate[date] = p.price;
    }
  }

  // Convert to series array, fill nulls for missing dates
  const series = Array.from(map.values()).map((info) => {
    const prices = dates.map((d) => info.priceByDate[d] ?? null);
    const latestPrice = [...prices].reverse().find((p) => p !== null) ?? null;
    return { name: info.name, prices, latestPrice };
  });

  // Sort by latest price ascending (cheapest first) and keep top 5
  series.sort(
    (a, b) => (a.latestPrice ?? Infinity) - (b.latestPrice ?? Infinity),
  );
  return { dates, series: series.slice(0, 5) };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function fmtFull(n) {
  return n.toLocaleString("vi-VN") + "₫";
}

function fmtDate(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function timeAgo(ts) {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.round(hrs / 24)} ngày trước`;
}

// ─── Chart drawing ────────────────────────────────────────────────────────────
function chartX(i) {
  const n = chartData.dates.length;
  if (n <= 1) return PAD.left + (CANVAS_W - PAD.left - PAD.right) / 2;
  return PAD.left + (i / (n - 1)) * (CANVAS_W - PAD.left - PAD.right);
}

function chartY(price, minP, maxP) {
  const h = CANVAS_H - PAD.top - PAD.bottom;
  return PAD.top + h - ((price - minP) / (maxP - minP)) * h;
}

function drawChart() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Background
  ctx.fillStyle = "#131e33";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const { dates, series } = chartData;

  if (dates.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      'Chưa có dữ liệu. Nhấn "Cập nhật" để tải.',
      CANVAS_W / 2,
      CANVAS_H / 2 - 8,
    );
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.fillText(
      "Extension sẽ tự động cập nhật khi mở trình duyệt.",
      CANVAS_W / 2,
      CANVAS_H / 2 + 12,
    );
    return;
  }

  // Price range
  let minP = Infinity,
    maxP = -Infinity;
  for (const s of series)
    for (const p of s.prices)
      if (p !== null) {
        minP = Math.min(minP, p);
        maxP = Math.max(maxP, p);
      }

  if (!isFinite(minP)) return;

  const span = Math.max(maxP - minP, maxP * 0.08);
  minP -= span * 0.06;
  maxP += span * 0.06;

  const cH = CANVAS_H - PAD.top - PAD.bottom;

  // ── Y-axis grid + labels
  const yTicks = 5;
  for (let t = 0; t <= yTicks; t++) {
    const p = minP + (t / yTicks) * (maxP - minP);
    const y = chartY(p, minP, maxP);

    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(CANVAS_W - PAD.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(fmt(p), PAD.left - 6, y + 4);
  }

  // ── Axes
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + cH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top + cH);
  ctx.lineTo(CANVAS_W - PAD.right, PAD.top + cH);
  ctx.stroke();

  // ── X-axis date labels (at most 10 ticks)
  const maxTicks = 10;
  const step =
    dates.length <= maxTicks ? 1 : Math.ceil(dates.length / maxTicks);
  ctx.fillStyle = "#64748b";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  for (let i = 0; i < dates.length; i += step) {
    const x = chartX(i);
    ctx.fillText(fmtDate(dates[i]), x, PAD.top + cH + 16);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, PAD.top + cH);
    ctx.lineTo(x, PAD.top + cH + 4);
    ctx.stroke();
  }

  // ── Hover vertical line
  if (hoverIdx >= 0 && hoverIdx < dates.length) {
    const hx = chartX(hoverIdx);
    ctx.strokeStyle = "rgba(148,163,184,.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, PAD.top);
    ctx.lineTo(hx, PAD.top + cH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Lines + dots
  for (let si = 0; si < series.length; si++) {
    const color = COLORS[si];
    const { prices } = series[si];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < dates.length; i++) {
      if (prices[i] === null) {
        started = false;
        continue;
      }
      const x = chartX(i),
        y = chartY(prices[i], minP, maxP);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Dots
    for (let i = 0; i < dates.length; i++) {
      if (prices[i] === null) continue;
      const x = chartX(i),
        y = chartY(prices[i], minP, maxP);
      const isHovered = i === hoverIdx;
      const r = isHovered ? 5 : 3.5;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isHovered ? color : "#131e33";
      ctx.beginPath();
      ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function buildLegend() {
  legendEl.innerHTML = "";
  const { dates, series } = chartData;

  for (let si = 0; si < series.length; si++) {
    const { name, prices, latestPrice } = series[si];
    const color = COLORS[si];

    const firstPrice = prices.find((p) => p !== null) ?? null;
    const diff =
      firstPrice && latestPrice && dates.length > 1
        ? latestPrice - firstPrice
        : 0;
    const pct =
      firstPrice && diff !== 0 ? ((diff / firstPrice) * 100).toFixed(1) : null;

    let changeHtml = '<span class="legend-change price-same">─</span>';
    if (pct !== null) {
      const arrow = diff > 0 ? "▲" : "▼";
      const cls = diff > 0 ? "price-up" : "price-down";
      changeHtml = `<span class="legend-change ${cls}">${arrow} ${Math.abs(pct)}%</span>`;
    }

    const shortName = name.length > 48 ? name.slice(0, 46) + "…" : name;

    const item = document.createElement("div");
    item.className = "legend-item";
    item.title = name;
    item.innerHTML = `
      <span class="legend-dot" style="background:${color}"></span>
      <span class="legend-name">${shortName}</span>
      <span class="legend-price">${latestPrice ? fmtFull(latestPrice) : "─"}</span>
      ${changeHtml}
    `;
    legendEl.appendChild(item);
  }
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function showTooltip(e, idx) {
  const { dates, series } = chartData;
  if (idx < 0 || idx >= dates.length) {
    tooltip.style.display = "none";
    return;
  }

  const date = dates[idx];
  let html = `<div class="tt-date">${date}</div>`;
  for (let si = 0; si < series.length; si++) {
    const price = series[si].prices[idx];
    if (price === null) continue;
    html += `
      <div class="tt-row">
        <span class="tt-dot" style="background:${COLORS[si]}"></span>
        <span class="tt-name">${series[si].name.split("|")[0].trim()}</span>
        <span class="tt-val">${fmtFull(price)}</span>
      </div>`;
  }
  tooltip.innerHTML = html;
  tooltip.style.display = "block";

  // Position relative to body (popup)
  const rect = canvas.getBoundingClientRect();
  let tx = rect.left + chartX(idx) + 12;
  let ty = e.clientY - 10;
  if (tx + 260 > window.innerWidth) tx = rect.left + chartX(idx) - 270;
  tooltip.style.left = tx + "px";
  tooltip.style.top = ty + "px";
}

// ─── Canvas mouse events ──────────────────────────────────────────────────────
canvas.addEventListener("mousemove", (e) => {
  const { dates } = chartData;
  if (dates.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;

  // Find nearest date index
  let best = 0,
    bestDist = Infinity;
  for (let i = 0; i < dates.length; i++) {
    const d = Math.abs(chartX(i) - mx);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  if (mx < PAD.left || mx > CANVAS_W - PAD.right) {
    hoverIdx = -1;
    tooltip.style.display = "none";
  } else {
    hoverIdx = best;
    showTooltip(e, hoverIdx);
  }
  drawChart();
});

canvas.addEventListener("mouseleave", () => {
  hoverIdx = -1;
  tooltip.style.display = "none";
  drawChart();
});

// ─── Render ───────────────────────────────────────────────────────────────────
function renderAll() {
  const raw = rawStorage[currentTab] || {};
  chartData = processData(raw);
  hoverIdx = -1;
  drawChart();
  buildLegend();

  const count = Object.keys(raw).length;
  if (count === 0) {
    statusMsg.textContent = "Chưa có dữ liệu.";
    statusMsg.className = "";
  } else {
    const today = new Date().toISOString().split("T")[0];
    const hasToday = !!raw[today];
    statusMsg.textContent = hasToday
      ? `${count} ngày dữ liệu · hôm nay đã cập nhật`
      : `${count} ngày dữ liệu · hôm nay chưa có`;
    statusMsg.className = hasToday ? "" : "error";
  }

  if (rawStorage.lastUpdate) {
    statusUpd.textContent = "Cập nhật: " + timeAgo(rawStorage.lastUpdate);
  }
}

// ─── Tab switcher ─────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;
    renderAll();
  });
});

// ─── Update button ────────────────────────────────────────────────────────────
btnUpdate.addEventListener("click", () => {
  btnUpdate.disabled = true;
  btnUpdate.textContent = "⏳ Đang tải...";
  statusMsg.textContent = "Đang cập nhật dữ liệu…";

  chrome.runtime.sendMessage({ action: "refresh" }, async () => {
    if (chrome.runtime.lastError) {
      statusMsg.textContent = "Lỗi: " + chrome.runtime.lastError.message;
      statusMsg.className = "error";
    } else {
      rawStorage = await loadStorage();
      renderAll();
    }
    btnUpdate.disabled = false;
    btnUpdate.textContent = "↻ Cập nhật";
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async function init() {
  rawStorage = await loadStorage();

  // Auto-fetch if today's data is missing for either category
  const today = new Date().toISOString().split("T")[0];
  const ramOk = rawStorage.ram && rawStorage.ram[today];
  const ssdOk = rawStorage.ssd && rawStorage.ssd[today];

  if (!ramOk || !ssdOk) {
    btnUpdate.disabled = true;
    btnUpdate.textContent = "⏳ Đang tải...";
    statusMsg.textContent = "Đang tải dữ liệu hôm nay…";

    chrome.runtime.sendMessage({ action: "refresh" }, async () => {
      rawStorage = await loadStorage();
      renderAll();
      btnUpdate.disabled = false;
      btnUpdate.textContent = "↻ Cập nhật";
    });
  } else {
    renderAll();
  }
})();
