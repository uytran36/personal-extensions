/**
 * Content script for keybr.com
 *
 * Keybr POSTs binary data to /_/sync/data when a lesson is saved.
 * We intercept that request as a signal that a lesson finished,
 * then scrape the visible DOM for speed / accuracy values.
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
      console.log("[FastFinger] Keybr session saved:", res);
    });

    window.dispatchEvent(
      new CustomEvent("ff:session-saved", { detail: payload }),
    );
  }

  // ── DOM scraper: parse visible text for "X.Xwpm" and "XX%" ──────────────
  function scrapeDOM() {
    // Keybr renders metrics as text: "Speed: 72.5wpm" and "Accuracy: 97%"
    // Walk all visible text nodes to find these patterns.
    const bodyText = document.body.innerText || "";

    const wpmMatch = bodyText.match(/speed[:\s]+([0-9]+(?:\.[0-9]+)?)\s*wpm/i);
    const accMatch = bodyText.match(/accuracy[:\s]+([0-9]+(?:\.[0-9]+)?)\s*%/i);

    const wpm = wpmMatch ? Math.round(parseFloat(wpmMatch[1])) : 0;
    const accuracy = accMatch ? parseFloat(accMatch[1]) : 0;

    if (!wpm) return null;

    return {
      site: "keybr",
      wpm,
      rawWpm: wpm,
      accuracy,
      duration: 0,
      mode: "keybr",
      createdAt: new Date().toISOString(),
    };
  }

  // ── Intercept fetch: Keybr POSTs binary to /_/sync/data on lesson save ───
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const res = await origFetch.apply(this, args);

    if (
      url.includes("/_/sync/data") &&
      (args[1]?.method || "GET").toUpperCase() === "POST"
    ) {
      // Wait a tick for React to re-render result stats
      setTimeout(() => {
        const payload = scrapeDOM();
        if (payload) sendResult(payload);
      }, 800);
    }

    return res;
  };

  // ── Fallback: MutationObserver for lesson result panel (CSS-module agnostic)
  // Keybr renders a result summary card with specific ARIA or data attrs.
  // We look for any element whose text contains "wpm" appearing in a section
  // that wasn't there before (child list change on document body subtree).
  let lastWpm = 0;
  const resultObserver = new MutationObserver(() => {
    const payload = scrapeDOM();
    if (payload && payload.wpm !== lastWpm) {
      lastWpm = payload.wpm;
      sendResult(payload);
    }
  });

  // Observe high up so we catch React re-renders of the lesson result panel
  resultObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
