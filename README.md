# Playground

A collection of small web-based apps built with plain HTML and JavaScript.

**Live site:** https://vbtronic.github.io/playground/

## Structure

Each web app lives in its own subfolder with an `index.html` entry point:

```
playground/
  index.html          ← landing page with links to all apps
  app-name/
    index.html
    ...
```

## Tech stack

- Plain HTML and modern JavaScript (no frameworks)
- Deployed via GitHub Pages with a GitHub Actions workflow

## Adding a new app

1. Create a subfolder (e.g. `my-app/`) with an `index.html`.
2. Add a link to it in the root `index.html`.
