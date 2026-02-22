# Agent Guidelines

This repository is a collection of small, self-contained web apps deployed as GitHub Pages.

## Project conventions

- **No frameworks.** Use plain HTML and modern JavaScript only (latest features supported by current versions of Chrome, Firefox, Safari, and Edge). No React, Vue, Angular, or similar.
- **No build step.** Everything is served as static files directly. No bundlers, transpilers, or package managers.
- **One subfolder per app.** Each web app gets its own directory at the repo root (e.g. `my-app/`) with an `index.html` entry point.
- **Root index.html** is the landing page listing all apps. When adding a new app, add a link to it here.
- **Keep it simple.** Each app should be small and focused. Prefer inline `<style>` and `<script>` tags for small apps; split into separate `.css`/`.js` files only when the app grows large enough to warrant it.

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
