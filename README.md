# Playground

A collection of small web apps and browser games built with plain HTML and modern JavaScript.

Live site: https://vbtronic.github.io/playground/

## Structure

Each app lives in its own subfolder with an `index.html` entry point:

```text
playground/
  index.html
  political-calculator/
  racing/
  games/
```

## Tech Stack

- Plain HTML and modern JavaScript
- No framework
- No build step
- Static deployment

## Local Testing

Serve the repo root with a static file server:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/` and verify the landing page plus every linked app.

## Production Notes

Deployment, custom-domain, private-repo, and payment-gateway guidance now lives in [DEPLOYMENT.md](DEPLOYMENT.md).
