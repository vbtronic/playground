# Agent Guidelines

This repository is a collection of small, self-contained web apps deployed as GitHub Pages.

## Project conventions

- **No frameworks.** Use plain HTML and modern JavaScript only (latest features supported by current versions of Chrome, Firefox, Safari, and Edge). No React, Vue, Angular, or similar.
- **No build step.** Everything is served as static files directly. No bundlers, transpilers, or package managers.
- **One subfolder per app.** Each web app gets its own directory at the repo root (e.g. `my-app/`) with an `index.html` entry point.
- **Root index.html** is the landing page listing all apps. When adding a new app, add a link to it here.
- **Keep it simple.** Each app should be small and focused. Prefer inline `<style>` and `<script>` tags for small apps; split into separate `.css`/`.js` files only when the app grows large enough to warrant it.

## App UI conventions

Every app must include:

- **Floating pill controls.** The language toggle (EN/CZ) and theme toggle (sun/moon icon) must be displayed together as a floating pill — a compact, rounded capsule. On the root landing page the pill is fixed in the top-right corner. In apps it sits inside the header's right section.
- **Language toggle (EN/CZ).** All apps are bilingual — English and Czech. English is always the default language. The language toggle is a pill with two options (`EN | CZ`); the active language is highlighted with the accent color.
- **Dark/light mode toggle.** All pages (including the root landing page) must include a sun/moon icon button to switch between dark and light themes. Light mode is the default everywhere. Theme preference is stored in `localStorage` (key `theme`) and shared across all pages.
- **Language persistence.** The selected language is stored in `localStorage` (key `lang`) and shared across all pages. English is the default when no preference is saved. When the user switches language on any page, the preference persists across page reloads and navigation.
- **Back to Playground link.** Every app header must have a visible link back to the root Playground homepage (e.g. `← Playground` pointing to `../`).
- **Restart / reset button.** Every app header must include a button to restart the app from the beginning without reloading the page.
- **Light modern design (default).** Apps default to a light, modern color scheme implemented via CSS custom properties (`:root` = light, `body.dark` = dark). Both themes are always available via the toggle.
- **Typography.** Use Inter (Google Fonts) as the primary typeface. Body text: 13–14px, weight 400. Emphasis: weight 500. Headings: weight 600, with negative letter-spacing (-0.01em to -0.04em). Load via `<link>` with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`.
- **Compact proportions.** Everything should feel tight and refined, never chunky. Headers: 38–44px height. Buttons: 5–8px vertical padding, 12px font size. Cards: 10–14px padding. Border-radius: 6–8px. Borders: 1px rgba-based (not solid colors). Use subtle box-shadows instead of thick borders for depth.

All pages default to light mode. Dark mode is available via the toggle on every page.

## Language & translation rules

- **Legal content is always in Czech.** Disclaimers, terms of use, legal notices, and similar legal text must always remain in Czech — they are never translated to English.
- **Author credits are always in Czech.** Author names and attribution (e.g. "Autor: …") stay in Czech regardless of the selected language.
- **Czech-specific app content stays in Czech.** Apps dealing with Czech law, politics, or other jurisdiction-specific topics (e.g. Political Calculator / Politická kalkulačka) keep their domain-specific content (party names, legal references, official terminology) in Czech even in the English version.

## Local testing

Before pushing, serve the repo locally and verify the app works in a browser. Any simple static file server will do:

```sh
# Using Python (built-in, no install needed)
python -m http.server 8000

# Using Node.js npx (no global install needed)
npx serve .
```

Then open `http://localhost:8000/` (or the port shown) and navigate to your app's subfolder. Check that:

- The app loads without errors in the browser console.
- All links and assets resolve correctly using relative paths.
- The root `index.html` landing page links to the new app.

## Deployment

The site is deployed to GitHub Pages via the workflow in `.github/workflows/deploy.yml`. Every push to `main` triggers a deploy. The entire repo root is published, so all paths are relative to `https://vbtronic.github.io/playground/`.
