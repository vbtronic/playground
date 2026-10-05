# Playground

A collection of small browser games built with plain HTML and modern JavaScript.

Live site: https://vbtronic.github.io/playground/

## Structure

Each app lives in its own subfolder with an `index.html` entry point:

```text
playground/
  index.html                       landing page
  racing/                          3D top-down racing (Three.js), keyboard + touch
  games/
    space-invaders-playground/     header shell around games/space-invaders/
    vesmirna-mise-playground/      header shell around games/vesmirna-mise/
    city-forge-playground/         header shell around games/city-forge/
  shared/                          shared page styles, theme/lang script, help modal
  privacy-policy/
  terms-of-service/
```

## Tech Stack

- Plain HTML and modern JavaScript
- No framework
- No build step
- Static deployment (GitHub Pages)

## Local Testing

Serve the repo root with a static file server:

```sh
# Makefile shortcut (default port 45213)
make dev

# or directly
python3 -m http.server 8000
```

Open `http://localhost:8000/` and verify the landing page plus every linked app.

## License

This repository is licensed under the MIT License. See `LICENSE`.
