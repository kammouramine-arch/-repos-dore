/* GYMREIGN — flagship interactions. Vanilla, no dependencies. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = (cents) => {
    const n = (cents / 100).toFixed(2).replace(".", ",").replace(",00", "");
    return "€" + n;
  };
  const qs = (s, r) => (r || document).querySelector(s);
  // Shopify CDN sizing via the width parameter — survives the ?v= cache buster,
  // unlike the legacy _360x filename form.
  const thumb = (u) => {
    try { const x = new URL(u, location.origin); x.searchParams.set("width", "360"); return x.toString(); }
    catch (e) { return u; }
  };
  const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- reveal on scroll ---------- */
  const revealables = qsa(".reveal");
  if (revealables.length && "IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- mobile menu ---------- */
  const burger = qs("[data-menu-toggle]");
  const mnav = qs("[data-mnav]");
  if (burger && mnav) {
    burger.addEventListener("click", () => {
      const open = doc.classList.toggle("is-menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      mnav.toggleAttribute("aria-hidden", !open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    mnav.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        doc.classList.remove("is-menu-open");
        document.body.style.overflow = "";
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      doc.classList.remove("is-menu-open", "is-cart-open");
      document.body.style.overflow = "";
    }
  });

  /* ---------- cart ---------- */
  const drawer = qs("[data-cart-drawer]");
  const veil = qs("[data-veil]");
  const counts = qsa("[data-cart-count]");

  const openCart = () => {
    doc.classList.add("is-cart-open");
    document.body.style.overflow = "hidden";
    const panel = qs(".drawer");
    if (panel) panel.focus({ preventScroll: true });
  };
  const closeCart = () => {
    doc.classList.remove("is-cart-open");
    document.body.style.overflow = "";
  };
  qsa("[data-cart-open]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); refreshCart().then(openCart); }));
  qsa("[data-cart-close]").forEach((b) => b.addEventListener("click", closeCart));
  if (veil) veil.addEventListener("click", closeCart);

  const setCount = (n) => counts.forEach((c) => {
    c.textContent = n;
    c.classList.toggle("is-on", n > 0);
  });

  const FREE_SHIP = 12000; // €120 threshold — real, configured in Shopify shipping

  function renderCart(cart) {
    setCount(cart.item_count);
    if (!drawer) return;
    const body = qs("[data-cart-body]", drawer);
    const foot = qs("[data-cart-foot]", drawer);
    if (!body) return;
    if (!cart.items.length) {
      body.innerHTML =
        '<div class="drawer__empty">' +
        '<p class="t-label t-faint">Your bag is empty</p>' +
        '<p class="t-h3" style="max-width:16em">The chapter is open. Nothing claimed yet.</p>' +
        '<a class="btn btn--ghost" href="/collections/chapter-001">Shop Chapter 001</a></div>';
      if (foot) foot.hidden = true;
      return;
    }
    body.innerHTML = cart.items.map((it) => {
      const opts = it.options_with_values ? it.options_with_values.map((o) => o.value).join(" · ")
        : (it.variant_title || "");
      return (
        '<div class="cline" data-line data-key="' + it.key + '">' +
        '<a class="cline__media" href="' + it.url + '">' +
        (it.image ? '<img src="' + thumb(it.image) + '" alt="" loading="lazy" width="84" height="105">' : "") +
        "</a>" +
        '<div><div class="cline__top"><a class="card__title" href="' + it.url + '">' + it.product_title.replace("GYMREIGN — ", "").replace(" — Chapter 001", "") + "</a>" +
        '<span class="t-num t-small">' + money(it.final_line_price) + "</span></div>" +
        '<p class="t-micro t-faint">' + opts + "</p>" +
        '<div class="cline__ctrl"><div class="qty" data-qty>' +
        '<button type="button" data-minus aria-label="Decrease quantity">−</button>' +
        "<span>" + it.quantity + "</span>" +
        '<button type="button" data-plus aria-label="Increase quantity">+</button></div>' +
        '<button type="button" class="cline__rm t-micro" data-remove>Remove</button>' +
        "</div></div></div>"
      );
    }).join("");
    if (foot) {
      foot.hidden = false;
      const totalEl = qs("[data-cart-total]", foot);
      if (totalEl) totalEl.textContent = money(cart.total_price);
      const fill = qs(".meter__fill", foot);
      const note = qs("[data-ship-note]", foot);
      if (fill && note) {
        const pct = Math.min(100, (cart.total_price / FREE_SHIP) * 100);
        fill.style.width = pct + "%";
        note.textContent = cart.total_price >= FREE_SHIP
          ? "Complimentary worldwide shipping unlocked."
          : money(FREE_SHIP - cart.total_price) + " away from complimentary shipping.";
      }
    }
  }

  async function api(path, opts) {
    const r = await fetch(path, Object.assign({
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    }, opts));
    if (!r.ok) throw new Error("cart " + r.status);
    return r.json();
  }
  const refreshCart = () => api("/cart.js").then(renderCart).catch(() => {});

  document.addEventListener("click", (e) => {
    const line = e.target.closest("[data-line]");
    if (!line) return;
    const key = line.dataset.key;
    const span = qs(".qty span", line);
    const q = span ? parseInt(span.textContent, 10) : 1;
    let next = null;
    if (e.target.closest("[data-plus]")) next = q + 1;
    if (e.target.closest("[data-minus]")) next = Math.max(0, q - 1);
    if (e.target.closest("[data-remove]")) next = 0;
    if (next === null) return;
    api("/cart/change.js", { method: "POST", body: JSON.stringify({ id: key, quantity: next }) })
      .then((cart) => {
        if (document.body.classList.contains("template-cart")) { location.reload(); return; }
        renderCart(cart);
      }).catch(() => {});
  });

  /* ---------- product form ----------
     Availability is server-authoritative. This controller may only DOWNGRADE the
     button after a positive variant match. Parse failure, an unmatched combination,
     or missing data all leave Liquid's purchasable state untouched. */
  qsa("[data-product]").forEach((root) => {
    const form = qs("form[data-product-form]", root);
    const idInput = qs("[data-variant-id]", root);
    const priceEls = qsa("[data-price]", root);
    const btns = qsa("[data-atc]", root);
    const setText = (b, t) => { const s = qs("[data-atc-text]", b); (s || b).textContent = t; };
    const label = (b) => b.dataset.label || "Add to bag";

    let data = null;
    const raw = qs("[data-product-json]", root);
    if (raw) { try { data = JSON.parse(raw.textContent); } catch (e) { data = null; } }

    // Without trustworthy data we do nothing at all: the server already rendered the truth.
    const usable = data && Array.isArray(data.variants) && data.variants.length
      && Array.isArray(data.options) && data.options.length;

    if (usable) {
      const variants = data.variants;
      const optNames = data.options;

      const selection = () => optNames.map((_, i) => {
        const el = qs('input[name="option-' + i + '"]:checked', root);
        return el ? el.value : null;
      });

      const match = (sel) => variants.find((v) =>
        Array.isArray(v.options) && sel.every((val, i) => val === null || v.options[i] === val));

      const sync = () => {
        const sel = selection();
        const v = match(sel);

        // reflect the chosen colour name
        qsa("[data-opt-val]", root).forEach((el) => {
          const i = parseInt(el.dataset.optVal, 10);
          if (sel[i]) el.textContent = sel[i];
        });

        // Mark sizes for the chosen colour. Two distinct states:
        //   is-void = that combination does not exist  -> not selectable
        //   is-off  = it exists but is not purchasable -> selectable, shows Sold out
        optNames.forEach((n, i) => {
          if (/colou?r/i.test(n)) return;
          qsa('input[name="option-' + i + '"]', root).forEach((inp) => {
            const probe = sel.slice();
            probe[i] = inp.value;
            const m = match(probe);
            const lab = inp.nextElementSibling;
            if (!lab) return;
            lab.classList.toggle("is-void", !m);
            lab.classList.toggle("is-off", !!m && m.available === false);
            inp.disabled = !m;
          });
        });

        // If the chosen colour does not come in the chosen size, snap to the first size
        // that colour is actually made in, rather than stranding a stale variant.
        if (!v) {
          const sizeIdx = optNames.findIndex((n) => !/colou?r/i.test(n));
          if (sizeIdx > -1) {
            const alt = variants.find((x) =>
              sel.every((val, i) => i === sizeIdx || val === null || x.options[i] === val));
            if (alt) {
              const inp = qs('input[name="option-' + sizeIdx + '"][value="' +
                alt.options[sizeIdx].replace(/"/g, '\\"') + '"]', root);
              if (inp && !inp.checked) { inp.checked = true; return sync(); }
            }
          }
          return;                             // still unmatched: leave server state alone
        }

        if (idInput && v.id != null) idInput.value = v.id;
        if (typeof v.price === "number") priceEls.forEach((p) => (p.textContent = money(v.price)));

        const ok = v.available !== false;     // only an explicit false disables
        btns.forEach((b) => {
          b.disabled = !ok;
          setText(b, ok ? label(b) : "Sold out");
        });

        // Show only the chosen colourway's shots. If that would empty the gallery,
        // show everything rather than leave the customer looking at nothing.
        const colorIdx = optNames.findIndex((n) => /colou?r/i.test(n));
        const chosen = colorIdx > -1 ? sel[colorIdx] : null;
        const shots = qsa(".pdp__shot", root);
        if (chosen && shots.length) {
          let shown = 0;
          shots.forEach((f) => {
            const cs = (f.dataset.colors || "").split("|").filter(Boolean);
            const on = cs.length === 0 || cs.indexOf(chosen) > -1;
            f.hidden = !on;
            if (on) shown++;
          });
          if (!shown) shots.forEach((f) => (f.hidden = false));
        }

        if (v.media) {
          const shot = qs('.pdp__shot[data-media-position="' + v.media + '"]', root);
          if (shot && !shot.hidden) shot.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
        }
        try {
          const u = new URL(location);
          u.searchParams.set("variant", v.id);
          history.replaceState({}, "", u);
        } catch (e) {}
      };

      qsa('input[type="radio"]', root).forEach((r) => r.addEventListener("change", sync));
      sync();
    }

    const submit = () => {
      const id = idInput && parseInt(idInput.value, 10);
      if (!id) return;
      btns.forEach((b) => { b.disabled = true; setText(b, "Adding…"); });
      api("/cart/add.js", { method: "POST", body: JSON.stringify({ id: id, quantity: 1 }) })
        .then(() => refreshCart())
        .then(() => {
          btns.forEach((b) => { b.disabled = false; setText(b, "Added to bag"); });
          setTimeout(() => btns.forEach((b) => setText(b, label(b))), 2200);
          openCart();
        })
        .catch(() => btns.forEach((b) => { b.disabled = false; setText(b, label(b)); }));
    };

    if (form) form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });

    const sticky = qs("[data-sticky-atc]", root);
    const buyBox = qs("[data-buy-box]", root);
    if (sticky) {
      const sBtn = qs("button", sticky);
      if (sBtn) sBtn.addEventListener("click", submit);
      if (buyBox && "IntersectionObserver" in window) {
        new IntersectionObserver((es) => {
          es.forEach((en) => sticky.classList.toggle("is-on",
            !en.isIntersecting && en.boundingClientRect.top < 0));
        }).observe(buyBox);
      }
    }
  });

  /* ---------- boot ---------- */
  refreshCart();
})();
