# storefront-probe.liquid

Reads real Shopify Liquid from a password-protected storefront.

1. Pick a theme that is **unpublished** (writes to the live theme are blocked).
2. Paste the probe into that theme's `layout/password.liquid`, right after
   `{{ content_for_layout }}`.
3. `curl -s -c jar -o /dev/null "$SHOP/?preview_theme_id=<theme id>"`
   then `curl -s -b jar -L "$SHOP/" | sed -n '/GRDIAG-START/,/GRDIAG-END/p'`
4. Restore `layout/password.liquid` afterwards.

The probe is invisible to visitors — it renders inside an HTML comment — but do
not leave it deployed.
