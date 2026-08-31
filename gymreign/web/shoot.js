/* Screenshot the simulator: desktop + mobile, full page + viewport. */
const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:8899";

const PAGES = [
  ["home", "/"],
  ["pdp-hoodie", "/products/gymreign-the-hoodie-chapter-001"],
  ["pdp-tee", "/products/gymreign-the-tee-chapter-001"],
  ["collection", "/collections/chapter-001"],
  ["cart-empty", "/cart"],
  ["search", "/search?q=hoodie"],
  ["password", "/password"],
  ["p404", "/404"],
];

(async () => {
  const only = process.argv[2] || null;
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--proxy-server=direct://", "--disable-background-networking", "--force-device-scale-factor=1"],
  });
  for (const [w, h, tag, mobile] of [[1440, 900, "d", false], [390, 844, "m", true]]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
    });
    const page = await ctx.newPage();
    for (const [name, path] of PAGES) {
      if (only && name !== only) continue;
      try {
        await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 40000 });
        // force-load all images, then wait for completion
        await page.evaluate(async () => {
          document.querySelectorAll("img").forEach(i => { i.loading = "eager"; });
          const h = document.body.scrollHeight;
          for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
          window.scrollTo(0, 0);
        });
        await page.waitForFunction(() =>
          Array.from(document.images).every(i => i.complete), { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(900);
        await page.evaluate(() => { document.querySelectorAll(".reveal").forEach(e => e.classList.add("is-in")); });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `shots/${name}-${tag}-vp.png` });
        await page.screenshot({ path: `shots/${name}-${tag}-full.png`, fullPage: true });
        console.log(`${name}-${tag} ok`);
      } catch (e) {
        console.log(`${name}-${tag} FAIL: ${e.message.split("\n")[0]}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
})();
