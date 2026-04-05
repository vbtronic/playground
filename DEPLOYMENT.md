# Deployment Guide

This project stays framework-free and static, but it is now structured so you can move it from GitHub Pages to a private repository, a custom domain, or your own server with minimal changes.

## Shared Configuration

All catalog-level settings live in [playground-config.js](playground-config.js):

- brand name and author metadata
- support email
- monthly license price
- license storage key
- payment provider placeholder values

For production, update `checkoutUrl` to your real Stripe Payment Link or your own checkout endpoint.

## Monthly License

The games catalog is currently priced at `€14.90 / month`.

The root landing page separates:

- free web applications
- paid games behind a shared license gate
- contact and sales entry points

Local preview remains unlocked on `localhost` and `127.0.0.1` so development and QA are not blocked.

## Payment Gateway Rollout

Recommended path:

1. Create a Stripe Payment Link for the monthly subscription.
2. Replace `payment.checkoutUrl` in `playground-config.js` with that live URL.
3. Point Stripe success and cancel redirects to your production homepage or dedicated confirmation pages.
4. Replace the client-side placeholder gating with a server-validated entitlement check when you move beyond static hosting.

Important: the current license gate is suitable for a static sales flow preview, but not for secure entitlement enforcement on a public production site. Real enforcement needs a backend or signed tokens.

## Custom Domain

For GitHub Pages:

1. Add your domain in the repository Pages settings.
2. Create a `CNAME` file at the repo root with your final domain.
3. Update DNS records to point at GitHub Pages.
4. If you move off GitHub Pages, keep relative paths exactly as they are now so the static structure still works.

## Private GitHub Repository

To move this project into a private GitHub repository:

1. Create the new private repository.
2. Push this codebase into that repo.
3. Recreate the Pages or deploy workflow with the same static publish root.
4. Update all public payment and contact references if the public URL changes.

## Own Server

Because the project is plain static HTML, CSS, and JS, any static host works:

- Nginx
- Apache
- Caddy
- S3 + CDN
- Cloudflare Pages
- a private VM serving the repo root directly

Minimum requirement: serve the repository root as static files and preserve relative URLs.

## Release Checklist

Before going live:

1. Replace the temporary payment placeholder with a real checkout URL.
2. Decide whether the final catalog will stay static or move license validation behind a backend.
3. Test every game entry page on the final domain.
4. Verify email links and the mailto contact form.
5. If using a private repo plus custom server, disable or replace any GitHub Pages specific deployment assumptions.


## Environment Values

See [ENV_SETUP.md](ENV_SETUP.md) for the `.env` template, what each value means, and how to obtain the Google and Stripe credentials.
