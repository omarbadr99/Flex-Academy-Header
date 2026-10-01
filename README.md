# Flex Academy header

Static prototype of the hero → "problems" transition: the full-bleed background
video shrinks on scroll and lands in the "Operations" card thumbnail.

- `index.html`, `styles.css`, `script.js`: no build step
- `assets/hero.mp4`: background video (re-encoded, audio stripped)
- `assets/cards/*.jpg`: **stand-in thumbnails** cut from the video. Swap in the
  real Figma exports using the same filenames.

Run locally: `python3 -m http.server` then open http://localhost:8000.

Deploy: import the repo on Vercel with the "Other" preset and no build command.
