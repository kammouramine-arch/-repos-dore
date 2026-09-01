/* Availability proof: drive every product in Chromium, switch colours and sizes,
   and record the resolved variant + Add-to-Bag state. */
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = "http://127.0.0.1:8899";
const data = JSON.parse(fs.readFileSync("products_full.json")).data.products.nodes;

(async () => {
  const b = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--proxy-server=direct://"],
  });
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const rows = [];
  let fails = 0;

  for (const p of data) {
    await page.goto(`${BASE}/products/${p.handle}`, { waitUntil: "networkidle" });
    const optNames = p.options.map((o) => o.name);
    const colourIdx = optNames.findIndex((n) => /colou?r/i.test(n));
    const sizeIdx = optNames.findIndex((n) => !/colou?r/i.test(n));
    const colours = p.options[colourIdx].optionValues.map((v) => v.name);
    const sizes = p.options[sizeIdx].optionValues.map((v) => v.name);

    // test every colour at a mid size, plus every size in the first colour
    const combos = [];
    for (const c of colours) combos.push([c, sizes[Math.floor(sizes.length / 2)]]);
    for (const s of sizes) combos.push([colours[0], s]);

    for (const [colour, size] of combos) {
      const pick = async (idx, value) => {
        const sel = `input[name="option-${idx}"][value="${value.replace(/"/g, '\\"')}"]`;
        const el = await page.$(sel);
        if (!el) return false;
        await page.evaluate((s) => {
          const i = document.querySelector(s);
          i.checked = true;
          i.dispatchEvent(new Event("change", { bubbles: true }));
        }, sel);
        return true;
      };
      await pick(colourIdx, colour);
      await pick(sizeIdx, size);
      await page.waitForTimeout(60);

      const state = await page.evaluate(() => {
        const b = document.querySelector(".pdp__buy [data-atc]");
        const t = b.querySelector("[data-atc-text]");
        return {
          text: (t || b).textContent.trim(),
          disabled: b.disabled,
          variantId: document.querySelector("[data-variant-id]").value,
          price: document.querySelector(".pdp__price").textContent.trim(),
        };
      });

      const exists = p.variants.nodes.find((v) => {
        const o = v.selectedOptions.map((x) => x.value);
        return o[colourIdx] === colour && o[sizeIdx] === size;
      });
      const shouldBuy = !!(exists && exists.availableForSale);
      const didBuy = !state.disabled && /add to bag/i.test(state.text);
      const ok = shouldBuy === didBuy;
      if (!ok) fails++;

      rows.push({
        product: p.handle.replace("gymreign-the-", "").replace("-chapter-001", "").toUpperCase(),
        colour, size,
        variantExists: !!exists,
        shopifyAvailable: exists ? exists.availableForSale : null,
        button: state.text,
        enabled: !state.disabled,
        price: state.price,
        verdict: ok ? "PASS" : "FAIL",
      });
    }
  }
  await b.close();

  const w = [10, 18, 6, 9, 16, 6, 6];
  const head = ["PRODUCT", "COLOUR", "SIZE", "EXISTS", "BUTTON", "ENABL", "OK"];
  console.log(head.map((h, i) => h.padEnd(w[i])).join(""));
  console.log("-".repeat(w.reduce((a, c) => a + c, 0)));
  for (const r of rows) {
    console.log([
      r.product, r.colour, r.size,
      r.variantExists ? "yes" : "NO",
      r.button, r.enabled ? "yes" : "no",
      r.verdict === "PASS" ? "✓" : "✗",
    ].map((c, i) => String(c).padEnd(w[i])).join(""));
  }
  console.log(`\n${rows.length} combinations tested · ${rows.length - fails} pass · ${fails} fail`);
  fs.writeFileSync("availability_report.json", JSON.stringify(rows, null, 1));
  process.exit(fails ? 1 : 0);
})();
