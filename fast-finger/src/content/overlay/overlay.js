/**
 * Overlay widget injected into all supported typing sites.
 * Listens for the ff:session-saved custom event fired by site content scripts.
 */

(function () {
  "use strict";

  // Prevent double-injection
  if (document.getElementById("ff-overlay")) return;

  // ── Build widget DOM ──────────────────────────────────────────────────────
  const root = document.createElement("div");
  root.id = "ff-overlay";
  root.innerHTML = `
    <div id="ff-overlay-inner">
      <div class="ff-ov-header">⌨ Fast Finger</div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Streak</span>
        <span class="ff-ov-val" id="ff-ov-streak">—</span>
      </div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Avg WPM</span>
        <span class="ff-ov-val" id="ff-ov-wpm">—</span>
      </div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Tests</span>
        <span class="ff-ov-val" id="ff-ov-tests">0</span>
      </div>
      <div class="ff-ov-row">
        <span class="ff-ov-label">Last WPM</span>
        <span class="ff-ov-val" id="ff-ov-last">—</span>
      </div>
      <div class="ff-ov-goal-row">
        <div class="ff-ov-goal-label">
          <span>WPM Goal</span>
          <span id="ff-ov-goal-pct">—</span>
        </div>
        <div class="ff-ov-goal-bar">
          <div class="ff-ov-goal-fill" id="ff-ov-goal-fill" style="width:0%"></div>
        </div>
      </div>
      <button id="ff-ov-toggle" title="Minimize">—</button>
    </div>
  `;
  document.body.appendChild(root);

  // ── Toggle minimize ───────────────────────────────────────────────────────
  let minimized = false;
  const inner = root.querySelector("#ff-overlay-inner");
  root.querySelector("#ff-ov-toggle").addEventListener("click", () => {
    minimized = !minimized;
    inner.classList.toggle("ff-ov-minimized", minimized);
  });

  // ── Load stats from service worker ───────────────────────────────────────
  function loadStats() {
    chrome.runtime.sendMessage(
      { type: "GET_STATS", range: "daily" },
      (stats) => {
        if (!stats) return;
        document.getElementById("ff-ov-wpm").textContent = stats.avgWpm || "—";
        document.getElementById("ff-ov-tests").textContent =
          stats.testCount || 0;
      },
    );

    chrome.runtime.sendMessage({ type: "GET_STREAK" }, (streak) => {
      if (!streak) return;
      document.getElementById("ff-ov-streak").textContent =
        `${streak.count} 🔥`;
    });

    // Goal progress
    chrome.storage.local.get(["goals", "sessions"], (data) => {
      const goals = data.goals || { wpm: 80 };
      const sessions = data.sessions || [];
      const todaySessions = sessions.filter(
        (s) =>
          new Date(s.createdAt).toDateString() === new Date().toDateString(),
      );
      if (!todaySessions.length) return;
      const avgWpm = Math.round(
        todaySessions.reduce((a, s) => a + (s.wpm || 0), 0) /
          todaySessions.length,
      );
      const pct = Math.min(100, Math.round((avgWpm / goals.wpm) * 100));
      document.getElementById("ff-ov-goal-pct").textContent = `${pct}%`;
      document.getElementById("ff-ov-goal-fill").style.width = `${pct}%`;
    });
  }

  loadStats();

  // ── Update immediately after a new session ────────────────────────────────
  window.addEventListener("ff:session-saved", (e) => {
    const detail = e.detail || {};
    if (detail.wpm) {
      document.getElementById("ff-ov-last").textContent = `${detail.wpm} WPM`;
    }
    loadStats();
  });
})();
