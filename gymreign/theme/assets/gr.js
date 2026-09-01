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

  /* ================================================================
     MOTION ENGINE
     One rAF loop, one IntersectionObserver, no libraries. Every effect
     below is an enhancement: with JS off, or prefers-reduced-motion on,
     the page is a plain, complete, scrollable document.
     ================================================================ */

  const raf = [];                                   // per-frame subscribers
  let ticking = false;
  const onFrame = (fn) => { raf.push(fn); if (!ticking) { ticking = true; loop(); } };
  function loop() {
    const y = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight || 800;
    for (let i = 0; i < raf.length; i++) raf[i](y, vh);
    requestAnimationFrame(loop);
  }
  const clamp = (n, a, b) => (n < a ? a : n > b ? b : n);
  // progress of an element through the viewport, 0 before, 1 after
  const through = (el, y, vh) => {
    const r = el.getBoundingClientRect();
    return clamp((vh - r.top) / (vh + r.height), 0, 1);
  };

  /* ---------- preloader ---------- */
  (() => {
    const boot = qs("[data-boot]");
    if (!boot) return;
    if (reduced || sessionStorage.getItem("gr-booted")) { boot.remove(); return; }
    boot.hidden = false;
    doc.classList.add("is-booting");
    const count = qs("[data-boot-count]", boot);
    const fill = qs("[data-boot-fill]", boot);
    let n = 1;
    const done = () => {
      doc.classList.remove("is-booting");
      doc.classList.add("is-booted");
      try { sessionStorage.setItem("gr-booted", "1"); } catch (e) {}
      setTimeout(() => boot.remove(), 1200);
    };
    const tick = setInterval(() => {
      n = Math.min(100, n + Math.max(1, Math.round((100 - n) * 0.14)));
      if (count) count.textContent = String(n).padStart(3, "0");
      if (fill) fill.style.transform = "scaleX(" + n / 100 + ")";
      if (n >= 100) { clearInterval(tick); setTimeout(done, 420); }
    }, 55);
    setTimeout(() => { clearInterval(tick); done(); }, 4000);   // never trap anyone
  })();

  /* ---------- split a heading into animatable lines ---------- */
  qsa("[data-split]").forEach((el) => {
    if (reduced) return;
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "sp";
      span.style.setProperty("--w", i);
      span.innerHTML = "<i>" + w + "</i>";
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.classList.add("is-split");
  });

  /* ---------- scroll progress + edge readout ---------- */
  (() => {
    const bar = qs("[data-scroll-bar]");
    const pct = qs("[data-scroll-pct]");
    if (!bar && !pct) return;
    onFrame((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp(y / max, 0, 1) : 0;
      if (bar) bar.style.transform = "scaleX(" + p + ")";
      if (pct) pct.textContent = String(Math.round(p * 100)).padStart(3, "0");
    });
  })();

  /* ---------- overture: one object, two beats ---------- */
  (() => {
    const ovt = qs("[data-overture]");
    if (!ovt || reduced) return;
    const mark = qs("[data-ovt-mark]", ovt);
    const beats = qsa("[data-ovt-beat]", ovt);
    ovt.classList.add("is-live");
    onFrame((y, vh) => {
      const r = ovt.getBoundingClientRect();
      const span = ovt.offsetHeight - vh;
      const p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;      // 0 -> 1 across the act
      if (mark) {
        const s = 1 - p * 0.34;
        mark.style.transform =
          "translate3d(" + (-p * 13) + "vw," + (p * 6) + "vh,0) scale(" + s + ") rotate(" + (p * -7) + "deg)";
        mark.style.opacity = String(0.85 - p * 0.28);
      }
      // beat 0 holds, hands over to beat 1 across the middle third
      const t = clamp((p - 0.34) / 0.3, 0, 1);
      if (beats[0]) {
        beats[0].style.opacity = String(1 - t);
        beats[0].style.transform = "translate3d(0," + (-t * 9) + "vh,0)";
        beats[0].style.pointerEvents = t > 0.5 ? "none" : "";
      }
      if (beats[1]) {
        beats[1].style.opacity = String(t);
        beats[1].style.transform = "translate3d(0," + ((1 - t) * 9) + "vh,0)";
        beats[1].style.pointerEvents = t > 0.5 ? "" : "none";
      }
    });
  })();

  /* ---------- header: transparent over the opening, inverts on light ground ---------- */
  (() => {
    const hdr = qs(".hdr");
    if (!hdr) return;
    const lights = qsa(".on-light, .on-light-tint");
    let stuck = null, light = null;
    onFrame((y) => {
      const s = y > 40;
      if (s !== stuck) { stuck = s; hdr.classList.toggle("is-stuck", s); }
      const line = hdr.getBoundingClientRect().bottom - 8;
      let over = false;
      for (let i = 0; i < lights.length; i++) {
        const r = lights[i].getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) { over = true; break; }
      }
      if (over !== light) { light = over; hdr.classList.toggle("is-light", over); }
    });
  })();

  /* ---------- parallax inside product plates ---------- */
  (() => {
    const inners = qsa("[data-plate-inner]");
    if (!inners.length || reduced) return;
    onFrame((y, vh) => {
      inners.forEach((el) => {
        const host = el.closest("[data-plate]") || el;
        const r = host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;         // offscreen, skip
        const p = through(host, y, vh) - 0.5;                    // -0.5 .. 0.5
        el.style.transform = "translate3d(0," + (p * -7) + "%,0) scale(1.08)";
      });
    });
  })();

  /* ---------- contrast rows: figure counts as it arrives ---------- */
  (() => {
    const rows = qsa("[data-ctr]");
    if (!rows.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.35 });
    rows.forEach((r) => io.observe(r));
  })();

  /* ---------- magnetic buttons (fine pointers only) ---------- */
  (() => {
    if (reduced || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    qsa(".btn--mag").forEach((b) => {
      const reset = () => { b.style.transform = ""; const s = qs("span", b); if (s) s.style.transform = ""; };
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = "translate3d(" + dx * 12 + "px," + dy * 8 + "px,0)";
        const s = qs("span", b);
        if (s) s.style.transform = "translate3d(" + dx * 5 + "px," + dy * 3 + "px,0)";
      });
      b.addEventListener("pointerleave", reset);
      b.addEventListener("blur", reset);
    });
  })();

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

  /* ---------- product ----------
     Availability is decided ENTIRELY by Shopify. Liquid renders the selected variant,
     its price and the button state; every option value is a link to a real variant id.
     Nothing here computes, infers or overrides availability — this code only swaps the
     server-rendered section in without a full page load, and posts the add to cart.
     If any of it fails, the links navigate normally and the page still works. */

  const SECTION_ID = "main";   // the product section's id in templates/product.json

  const bindProduct = (root) => {
    const form = qs("form[data-product-form]", root);
    const idInput = qs("[data-variant-id]", root);
    const btns = qsa("[data-atc]", root);
    const setText = (b, t) => { const s = qs("[data-atc-text]", b); (s || b).textContent = t; };
    const label = (b) => b.dataset.label || "Add to bag";

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
  };

  qsa("[data-product]").forEach(bindProduct);

  // Choosing an option: let Shopify re-render the section for that variant.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-variant-link]");
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // let the browser do it
    const root = a.closest("[data-product]");
    if (!root) return;
    e.preventDefault();

    const url = new URL(a.href, location.href);
    const fallback = () => location.assign(url.href);
    if (!window.fetch || !window.DOMParser) return fallback();

    root.classList.add("is-swapping");
    fetch(url.pathname + url.search + "&section_id=" + SECTION_ID, { headers: { Accept: "text/html" } })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then((html) => {
        const fresh = new DOMParser().parseFromString(html, "text/html").querySelector("[data-product]");
        if (!fresh) throw new Error("no section");
        root.replaceWith(fresh);
        bindProduct(fresh);
        fresh.classList.remove("is-swapping");
        history.replaceState({}, "", url.href);
      })
      .catch(fallback);
  });

  /* ---------- boot ---------- */
  refreshCart();
})();
