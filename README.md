# Flex Academy header

Static prototype of the hero → "problems" transition: the full-bleed background
video shrinks on scroll and lands in the "Operations" card thumbnail.

- `index.html`, `styles.css`, `script.js`: no build step
- `assets/hero.mp4`: background video (re-encoded, audio stripped)
- `assets/cards/*.jpg`: card images from the Figma file (1x renders; drop in
  2x exports with the same filenames for sharper Retina thumbnails)

Run locally: `python3 -m http.server` then open http://localhost:8000.

Deploy: import the repo on Vercel with the "Other" preset and no build command.
