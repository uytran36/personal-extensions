// ─── API URLs (from API.md) ────────────────────────────────────────────────
const RAM_URL =
  "https://tinhocngoisao.com/search?type=product&q=" +
  "filter=((collectionid%3Aproduct%3D1002901823)%26%26((tag%3Aproduct**DDR4))%26%26((tag%3Aproduct**8GB)))" +
  "&sortby=(price:product=asc)";

const SSD_URL =
  "https://tinhocngoisao.com/search?type=product&q=" +
  "filter=((collectionid%3Aproduct%3D1002902812)%26%26((tag%3Aproduct**1TB))%26%26((tag%3Aproduct**M.2%20NVMe%20PCIe)))" +
  "&sortby=(price:product=asc)";

const FETCH_HEADERS = {
  accept: "text/html, */*; q=0.01",
  "accept-language": "vi,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "x-requested-with": "XMLHttpRequest",
};

// ─── HTML parser ────────────────────────────────────────────────────────────
/**
 * Parses up to 5 products from a Haravan search result HTML page.
 * Each product is: { name, url, price }
 */
function parseProducts(html) {
  const products = [];
  const seen = new Set();

  // Split by opening <h3> tags to isolate product name sections
  const segments = html.split(/<h3[^>]*>/i);

  for (let i = 1; i < segments.length && products.length < 5; i++) {
    const seg = segments[i];

    // Find the product link inside this h3 block
    const linkMatch = seg.match(
      /href="(\/products\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/,
    );
    if (!linkMatch) continue;

    const slug = linkMatch[1];
    if (seen.has(slug)) continue; // skip duplicate product entries

    // Strip any inner HTML tags from the anchor text to get the clean name
    const name = linkMatch[2].replace(/<[^>]+>/g, "").trim();
    if (!name) continue;

    // Look for price immediately after the closing </h3> (within next 900 chars)
    const afterH3Start = seg.indexOf("</h3>");
    const priceArea = seg.substring(
      afterH3Start > -1 ? afterH3Start : 0,
      (afterH3Start > -1 ? afterH3Start : 0) + 900,
    );

    // Price format: 1,690,000₫  or  2.590.000₫  (some sites use periods)
    const priceMatch = priceArea.match(/([\d]{1,3}(?:[,.][\d]{3})+)(?:₫|đ)/);
    if (!priceMatch) continue;

    const price = parseInt(priceMatch[1].replace(/[,.]/g, ""), 10);
    if (!price || price < 100_000) continue; // sanity check: at least 100k VND

    seen.add(slug);
    products.push({ name, url: "https://tinhocngoisao.com" + slug, price });
  }

  return products;
}

// ─── Fetch & store ──────────────────────────────────────────────────────────
async function fetchAndStore(force = false) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const stored = await chrome.storage.local.get(["ram", "ssd"]);
  const ramData = stored.ram || {};
  const ssdData = stored.ssd || {};

  const ramNeeded = force || !ramData[today];
  const ssdNeeded = force || !ssdData[today];

  if (!ramNeeded && !ssdNeeded) {
    console.log("[PriceTracker] Already up-to-date for", today);
    return;
  }

  console.log("[PriceTracker] Fetching prices for", today, { force });

  try {
    if (ramNeeded) {
      const res = await fetch(RAM_URL, { headers: FETCH_HEADERS });
      if (res.ok) {
        const html = await res.text();
        const products = parseProducts(html);
        if (products.length > 0) {
          ramData[today] = products;
          console.log("[PriceTracker] RAM:", products);
        } else {
          console.warn("[PriceTracker] No RAM products parsed from response.");
        }
      }
    }

    if (ssdNeeded) {
      const res = await fetch(SSD_URL, { headers: FETCH_HEADERS });
      if (res.ok) {
        const html = await res.text();
        const products = parseProducts(html);
        if (products.length > 0) {
          ssdData[today] = products;
          console.log("[PriceTracker] SSD:", products);
        } else {
          console.warn("[PriceTracker] No SSD products parsed from response.");
        }
      }
    }

    await chrome.storage.local.set({
      ram: ramData,
      ssd: ssdData,
      lastUpdate: Date.now(),
    });
    console.log("[PriceTracker] Storage updated.");
  } catch (err) {
    console.error("[PriceTracker] Fetch error:", err);
  }
}

// ─── Event listeners ────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => fetchAndStore());
chrome.runtime.onStartup.addListener(() => fetchAndStore());

// Allow popup to trigger a forced refresh
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "refresh") {
    fetchAndStore(true)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep message channel open for async response
  }
});
