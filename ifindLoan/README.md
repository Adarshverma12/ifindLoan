# iFindLoan — Personal Loans $100–$5,000 (static site)

Premium, lightweight, conversion-focused affiliate landing site for **ifindloan.com**.
SoFi / LendingTree-style light-green layout, split hero (copy left / loan funnel right), and the
full compliance footer. Pure HTML5 + CSS3 + vanilla JS — no frameworks, no build step.

## Brand & contact
- Domain: `ifindloan.com`
- Address: 1317 Edgewater Dr #2659, Orlando, FL 32804
- Email: info@ifindloan.com

## Loan funnel (EPC)
The hero form mounts via the EPC funnel script into `#loan-funnel`. **Do not rename** that ID,
the script attributes, or the container.

```html
<div class="form-mount" id="loan-funnel">…</div>
<!-- Do not use defer/async on this script — it reads document.currentScript -->
<script
  src="https://dj3x6xq3uws84.cloudfront.net/fcs/epc-funnel-pp-1763055302.min.js"
  data-epc-target="#loan-funnel"
  data-epc-affiliate="503777"
  data-epc-campaign="117"
  data-epc-funnel="9999">
</script>
```

A small head script rewrites invalid `file://` `site_url` values before the EPC
register call (otherwise the form hangs on “Please wait…”). A skeleton placeholder
shows until the funnel injects content (`site.js` marks `#loan-funnel` ready).

## Design system
- Palette: emerald `#14a05c` / primary `#0f7a4a` + mint surfaces + deep ink `#071a14` + dark-navy footer `#06101c`.
- Type: Schibsted Grotesk (display) + Figtree (body).
- Glassmorphism on header, form card, sticky CTA; soft elevation shadows; scroll reveals.
- Single stylesheet `style.css`; behaviour in `site.js` (mobile nav, scroll reveals,
  sticky CTA, amount chips, loan-payment calculator, funnel skeleton).

## Structure
```
index.html                 Home (hero + sections + calculator + FAQ)
404.html
style.css   site.js
robots.txt  sitemap.xml
assets/img/                og.png, favicon.svg, apple-touch-icon.png, loan photos
how-it-works.html  about-us.html  why-choose-us.html  rates-fees.html  definitions.html  questions.html  contact.html
advertising-disclosure.html
privacy-policy.html  terms-of-use.html  disclaimer.html  e-consent.html  lending-policy.html
credit-authorization.html  california-privacy-notice.html  do-not-sell-my-info.html  unsubscribe.html
```
Flat file structure — every page is a single `.html` file at the project root (no subfolders except `assets/img/`). All interior pages share a consistent header/footer.

## SEO / AEO / compliance
- Per-page title, meta description, self-canonical, Open Graph + Twitter cards, favicon trio.
- JSON-LD: FinancialService + WebSite + FAQPage on home; BreadcrumbList + Article on content pages.
- Compliance: verbatim ifindloan footer disclosures, CCPA "Do Not Sell" + Privacy links,
  tribal-lender warning, **no fake testimonials or star ratings**.

## Preview locally
Opening `index.html` directly (double-click / `file://`) works for the loan form —
a small patch rewrites the EPC `site_url` when the browser would otherwise send
`file:///`, which the register API rejects.

You can also serve over HTTP:

```
python -m http.server 5599
# open http://localhost:5599/
```

Or double-click `start-preview.bat` on Windows.
Serve from the site root so relative paths resolve correctly.
