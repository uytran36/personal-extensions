/**
 * Content script for 10fastfingers.com
 *
 * 10FF is an AngularJS app. When a test ends the timer reaches 0 and
 * the result section (#result-table) becomes visible via ng-show (which
 * toggles the "ng-hide" CSS class). We watch for that class removal.
 *
 * Result DOM layout (verified):
 *   #result-table tbody tr:first-child
 *     td.num:nth-child(1)  → WPM
 *     td.num:nth-child(2)  → Accuracy %
 *     td.num:nth-child(3)  → Correct words
 *     td.num:nth-child(4)  → Wrong words
 */

(function () {
  "use strict";

  let lastSentAt = 0;

  function sendResult(payload) {
    const now = Date.now();
    if (now - lastSentAt < 3000) return;
    lastSentAt = now;

    chrome.runtime.sendMessage({ type: "SAVE_SESSION", payload }, (res) => {
      if (chrome.runtime.lastError) return;
      console.log("[FastFinger] 10FF session saved:", res);
    });

    window.dispatchEvent(
      new CustomEvent("ff:session-saved", { detail: payload }),
    );
  }

  function scrapeResult() {
    const resultEl = document.getElementById("result-table");
    if (!resultEl) return null;

    // Must be visible (ng-show removes ng-hide class)
    if (resultEl.classList.contains("ng-hide")) return null;

    // Primary: grab table cells in first data row
    const cells = resultEl.querySelectorAll("tbody tr:first-child td");
    let wpm = 0;
    let accuracy = 0;

    if (cells.length >= 2) {
      wpm = parseInt(cells[0].textContent.trim(), 10) || 0;
      accuracy = parseFloat(cells[1].textContent.trim()) || 0;
    }

    // Fallback: scan all spans/divs for WPM-like number
    if (!wpm) {
      const wpmEl =
        resultEl.querySelector("[class*='wpm']") ||
        resultEl.querySelector(".highlight");
      if (wpmEl) wpm = parseInt(wpmEl.textContent.trim(), 10) || 0;
    }

    if (!wpm) return null;

    return {
      site: "10fastfingers",
      wpm,
      rawWpm: wpm,
      accuracy,
      duration: 60,
      mode: "english",
      createdAt: new Date().toISOString(),
    };
  }

  // ── Watch #result-table for class changes (ng-hide added/removed) ────────
  function attachObserver() {
    const resultEl = document.getElementById("result-table");
    if (!resultEl) return false;

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          const isVisible = !resultEl.classList.contains("ng-hide");
          if (isVisible) {
            // AngularJS may still be updating the DOM; wait a tick
            setTimeout(() => {
              const payload = scrapeResult();
              if (payload) sendResult(payload);
            }, 300);
          }
        }
      }
    });

    obs.observe(resultEl, { attributes: true, attributeFilter: ["class"] });
    return true;
  }

  // ── Wait for AngularJS to render #result-table (SPA, may load later) ─────
  let attempts = 0;
  const interval = setInterval(() => {
    if (attachObserver() || ++attempts > 30) clearInterval(interval);
  }, 500);

  // ── Fallback: also watch for the "done" scope variable via URL hash ───────
  // 10FF sometimes navigates to #/ on completion — catch that too
  window.addEventListener("hashchange", () => {
    setTimeout(() => {
      const payload = scrapeResult();
      if (payload) sendResult(payload);
    }, 500);
  });
})();
