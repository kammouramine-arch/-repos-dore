# What is real, what is a demo, and exactly what remains

This document exists so that nothing on this site is mistaken for something
it is not. Read the first table before you show the site to anyone.

## Status at a glance

| Area | State | Notes |
|---|---|---|
| Design system, pages, copy | **Production** | Sixteen static pages, no runtime framework, no build step at request time. |
| Case content (UF-000, UF-001) | **Production** | Complete, internally consistent, and verified solvable. |
| Investigation interface | **Production** | Evidence viewer, cross-reference tool, notebook, theory grading, reveal. Tested end to end. |
| Progress, notes, theories | **Production** | Stored in the visitor's browser. Working as designed, offline-capable. |
| Share images, icons, manifest, sitemap, robots | **Production** | Regenerate with `tools/make-og.sh` and `tools/build.py`. |
| **Payment** | **DEMO — takes no money** | `checkout.html` is the finished interface with no provider behind it. It says so on the page. |
| **Access control** | **DEMO — client-side only** | A visitor can grant themselves a case from the browser console. |
| **Order emails** | **NOT BUILT** | Nothing is sent. `order-complete.html` says so. |
| **Contact form** | **NOT WIRED** | Validates, then tells the visitor to use the email address instead. |
| **Accounts / cross-device sync** | **NOT BUILT** | Deliberate. Export/import on the dashboard is the interim. |
| **Analytics** | **NONE** | Nothing is loaded from another domain. |

Nothing in this repository pretends to work. Every demo surface says so in
the interface, not only here.

---

## 1 · Things only you can do

These need your accounts and cannot be done from inside the repository.

1. **Buy the domain** and point it at the host. The canonical origin is set
   in one place: `SITE_URL` at the top of `tools/build.py`. Change it, run
   `python3 tools/build.py`, and every canonical tag, Open Graph URL and
   sitemap entry updates.
2. **Create a Stripe account** (or Paddle / Lemon Squeezy — see §2) and get
   a publishable key, a secret key and a webhook signing secret.
3. **Decide your VAT position.** Selling digital goods to EU consumers means
   VAT at the customer's rate. Paddle and Lemon Squeezy act as merchant of
   record and handle this for you; Stripe does not, though Stripe Tax will
   calculate it. This is the single biggest reason to consider a merchant of
   record for launch.
4. **Register the legal entity** and fill in the redacted fields in
   `terms.html` and `privacy.html` — legal name, address, company number,
   jurisdiction.
5. **Have the legal pages reviewed.** They are written to match how the
   product actually behaves, which is the hard part, but they are not legal
   advice and no lawyer has seen them.
6. **Claim the social handles.** The footer currently links to
   `@theunknownfile` on TikTok, Instagram and YouTube. Update
   `tools/layout.html` if the handles differ.
7. **Set up the mailbox** at `contact@theunknownfile.com`, or change the
   address in `tools/pages/contact.html` and `faq.html`.

## 2 · Payment: the recommended path

**Use a merchant of record for launch.** Lemon Squeezy or Paddle. They take
a higher percentage than Stripe and they remove EU VAT registration,
invoicing and remittance from your life entirely. For a product at €14.99
with no team behind it, that trade is worth making. Move to Stripe later if
volume justifies the accounting.

Either way the integration shape is the same, and the rule is the same:

> **Access is granted by the server, on a verified webhook. Never by the
> browser.**

### 2.1 Replace the demo checkout

`assets/js/app.js` → the `checkout()` block. Today it validates the email
and calls `store.grant()`. Replace the submit handler with a redirect to a
hosted checkout:

```js
const res = await fetch('/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sku: product.sku, email }),
});
const { url } = await res.json();
location.href = url;            // hosted checkout, PCI stays off your site
```

Keep the demo notice on `checkout.html` until this is live, and delete it
in the same commit that removes `store.grant()` from the client.

### 2.2 Grant access on the webhook

A minimal serverless function (Netlify, Vercel, Cloudflare Workers all work):

```js
// POST /api/webhook
export default async function handler(req) {
  const event = verifySignature(req);          // provider SDK — do not skip
  if (event.type !== 'checkout.completed') return ok();

  const { email, sku } = event.data;
  const grants = PRODUCTS[sku].grants;         // mirror assets/js/data/cases.js
  const token = await issueAccessToken(email, grants);   // signed, long-lived

  await db.orders.insert({ email, sku, grants, ref: event.id });
  await sendAccessEmail(email, token);
  return ok();
}
```

### 2.3 Verify access when a case opens

`assets/js/investigate.js` has one access check, marked with a warning
comment. Replace it:

```js
const free = meta.state === 'free';
if (!free) {
  const res = await fetch(`/api/access?case=${caseId}`, { credentials: 'include' });
  const { granted } = await res.json();
  if (!granted) return gate(/* … */);
}
```

The access link in the order email should carry the token, set an
HttpOnly cookie, and redirect to `investigate.html?case=UF-001`.

### 2.4 Keep prices in one place

`assets/js/data/cases.js` exports `PRODUCTS`. The site, the build script and
your checkout function should all read from it. When you change a price,
change it there and mirror it in the provider dashboard — a mismatch between
the two is the classic way to sell something at the wrong price.

## 3 · Order email

Any transactional provider (Resend, Postmark, SES). One template:

- Subject: `Case #001 is open`
- Body: the case title, the order reference, and the access link.
- Nothing else. No upsell in a receipt.

Also send a second message only if the customer ticked the release-list box.

## 4 · Deployment

The site is static. Any host works.

**Netlify or Cloudflare Pages**, publish directory `unknown-file/`, no build
command. Serverless functions live alongside for §2.

**Before you deploy:**

```bash
python3 tools/build.py        # regenerates HTML, sitemap.xml, robots.txt
```

Set long cache headers on `assets/**` and a short one on `*.html`.
Asset filenames are stable, so if you change a stylesheet, either version
the filename or keep the HTML cache short.

Serve `404.html` as the not-found page. Netlify picks it up automatically.

## 5 · Analytics, when you want it

The site currently loads nothing from another domain, and the privacy
notice says so. If you add analytics:

1. Choose something cookieless (Plausible, Fathom) so you do not need a
   consent banner in the EU.
2. Update `privacy.html` **in the same commit**. The notice currently makes
   a specific promise; breaking it quietly is the one thing that would
   genuinely damage this brand.

The three numbers worth watching: free-case starts per hundred sessions,
free-case completions per start, and paid conversions per free-case
completion. If the middle number is low, the problem is the product, not
the page.

## 6 · Known limitations, stated plainly

- **Client-side access control.** Anyone who opens the console can grant
  themselves a paid case. Acceptable while nothing is being sold; not
  acceptable the day it is. §2.3 fixes it.
- **Progress is device-local.** Clear your browser, lose your notes. The
  dashboard has export/import as the interim, and the FAQ says so.
- **No account system.** Deliberate for launch — an account is friction at
  exactly the wrong moment. Revisit when a membership tier opens.
- **The build step is a convenience, not a requirement.** Every page in the
  repository is complete static HTML. If you would rather hand-edit them,
  delete `tools/` and nothing breaks.
