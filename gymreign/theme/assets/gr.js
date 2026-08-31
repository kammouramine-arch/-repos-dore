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
        (it.image ? '<img src="' + it.image.replace(/(\.[a-z]+)(\?|$)/, "_360x$1$2") + '" alt="" loading="lazy" width="84" height="105">' : "") +
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

  /* ---------- product form ---------- */
  qsa("[data-product]").forEach((root) => {
    let data;
    try { data = JSON.parse(qs("[data-product-json]", root).textContent); } catch (e) { return; }
    const variants = data.variants;
    const optNames = data.options;
    const form = qs("form[data-product-form]", root);
    const priceEl = qsa("[data-price]", root);
    const btns = qsa("[data-atc]", root);
    const idInput = qs('input[name="id"]', form);

    const current = () => optNames.map((n, i) =>
      (qs('input[name="option-' + i + '"]:checked', root) || {}).value);

    const findVariant = (sel) => variants.find((v) =>
      sel.every((val, i) => !val || v.options[i] === val));

    function sync() {
      const sel = current();
      const v = findVariant(sel);
      // disable size labels with no available variant for the chosen colour
      optNames.forEach((n, i) => {
        if (!/size/i.test(n)) return;
        qsa('input[name="option-' + i + '"]', root).forEach((inp) => {
          const test = sel.slice();
          test[i] = inp.value;
          const match = variants.find((x) => x.options.every((o, j) => o === test[j] || !test[j]));
          const ok = match && match.available;
          inp.nextElementSibling.classList.toggle("is-off", !ok);
        });
      });
      qsa("[data-opt-val]", root).forEach((el) => {
        const i = parseInt(el.dataset.optVal, 10);
        el.textContent = sel[i] || "";
      });
      if (!v) { btns.forEach((b) => { b.disabled = true; b.textContent = "Unavailable"; }); return; }
      idInput.value = v.id;
      priceEl.forEach((p) => (p.textContent = money(v.price)));
      const ok = v.available;
      btns.forEach((b) => { b.disabled = !ok; b.textContent = ok ? b.dataset.label : "Sold out"; });
      // swap gallery to the variant image
      if (v.featured_media_position) {
        const shot = qsa(".pdp__shot", root)[v.featured_media_position - 1];
        if (shot) shot.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
      }
      const u = new URL(location);
      u.searchParams.set("variant", v.id);
      history.replaceState({}, "", u);
    }
    qsa("input[type=radio]", root).forEach((r) => r.addEventListener("change", sync));
    sync();

    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      btns.forEach((b) => { b.disabled = true; b.textContent = "Adding…"; });
      api("/cart/add.js", { method: "POST", body: JSON.stringify({ id: parseInt(idInput.value, 10), quantity: 1 }) })
        .then(() => refreshCart())
        .then(() => {
          btns.forEach((b) => { b.disabled = false; b.textContent = "Added — in your bag"; });
          setTimeout(() => btns.forEach((b) => { b.textContent = b.dataset.label; }), 2200);
          openCart();
        })
        .catch(() => btns.forEach((b) => { b.disabled = false; b.textContent = b.dataset.label; }));
    });

    /* sticky mobile ATC */
    const sticky = qs("[data-sticky-atc]");
    const buyBox = qs("[data-buy-box]", root);
    if (sticky && buyBox && "IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        es.forEach((en) => sticky.classList.toggle("is-on", !en.isIntersecting && en.boundingClientRect.top < 0));
      }).observe(buyBox);
      qs("button", sticky).addEventListener("click", () => {
        form.requestSubmit();
      });
    }
  });

  /* ---------- boot ---------- */
  refreshCart();
})();
