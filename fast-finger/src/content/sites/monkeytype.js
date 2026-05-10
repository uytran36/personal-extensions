/**
 * Content script for monkeytype.com
 * Listens for the test-complete event fired by Monkeytype's own JS,
 * then scrapes the result DOM and sends it to the service worker.
 */

(function () {
  "use strict";

  let lastSentAt = 0;

  function scrapeResult() {
    const wpmEl = document.querySelector("#result .wpm .bottom");
    const rawWpmEl = document.querySelector("#result .raw .bottom");
    const accEl = document.querySelector("#result .acc .bottom");
    const timeEl = document.querySelector("#result .time .bottom");
    const modeEl = document.querySelector("#testModesNotice");

    const wpm = parseInt(wpmEl?.textContent?.trim(), 10) || 0;
    const rawWpm = parseInt(rawWpmEl?.textContent?.trim(), 10) || 0;
    const accuracy =
      parseFloat(accEl?.textContent?.replace("%", "")?.trim()) || 0;
    const duration = parseInt(timeEl?.textContent?.trim(), 10) || 0;
    const mode = modeEl?.textContent?.trim() || "unknown";

    if (!wpm) return null;

    return {
      wpm,
      rawWpm,
      accuracy,
      duration,
      mode,
      createdAt: new Date().toISOString(),
    };
  }

  function sendResult(payload) {
    const now = Date.now();
    if (now - lastSentAt < 3000) return; // debounce 3 s
    lastSentAt = now;

    chrome.runtime.sendMessage({ type: "SAVE_SESSION", payload }, (res) => {
      if (chrome.runtime.lastError) return;
      console.log("[FastFinger] Session saved:", res);
    });

    // Notify overlay
    window.dispatchEvent(
      new CustomEvent("ff:session-saved", { detail: payload }),
    );
  }

  // ── Strategy 1: MutationObserver on #result visibility ───────────────────
  const resultEl = document.querySelector("#result");
  if (resultEl) {
    const obs = new MutationObserver(() => {
      const visible =
        resultEl.style.display !== "none" &&
        !resultEl.classList.contains("hidden");
      if (visible) {
        const payload = scrapeResult();
        if (payload) sendResult(payload);
      }
    });
    obs.observe(resultEl, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  // ── Strategy 2: XHR/fetch intercept for /api/results/save ────────────────
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (url.includes("/results") && args[1]?.method === "POST") {
      try {
        const clone = res.clone();
        const body = await clone.json();
        const payload = {
          wpm: body.wpm || 0,
          rawWpm: body.rawWpm || 0,
          accuracy: body.acc || 0,
          duration: body.testDuration || 0,
          mode: body.mode || "unknown",
          createdAt: new Date().toISOString(),
        };
        if (payload.wpm) sendResult(payload);
      } catch (_) {}
    }
    return res;
  };
})();
