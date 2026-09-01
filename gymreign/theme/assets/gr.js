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
