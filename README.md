# TacoBoutIT

The code behind [tacobout.domoretech.net](https://tacobout.domoretech.net): an
independent map of Taco Bell menu prices across US cities, and **Coin Spinner**,
a browser remake of the coin-drop counter game restaurants had in the 2000s.

Not affiliated with or endorsed by Taco Bell or Yum! Brands. Taco Bell® is a
registered trademark of its owner.

## What you can reuse

| Part | Terms |
|---|---|
| Code (`*.html`, `*.css`, `*.js`) | [PolyForm Noncommercial 1.0.0](LICENSE.md): free for personal, hobby, school, research and nonprofit use. Commercial use needs permission. |
| Artwork and page text (`assets/brand/`, `assets/food/`, `assets/game/*.webp`, `assets/game/share.jpg`, the site's wording) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/): share and adapt for non-commercial use, with credit. |
| Price data (`data/`, and the full table at [tacobout-data](https://github.com/domoretechnet/tacobout-data/releases)) | Free to use, including commercially. Credit TacoBoutIT with a link to https://tacobout.domoretech.net. |
| MapLibre GL JS (`assets/vendor/maplibre/`) | Its own open-source licenses, in [`assets/vendor/maplibre/LICENSE.txt`](assets/vendor/maplibre/LICENSE.txt). |

Credit for the code and artwork: "TacoBoutIT by DoMoreTech,
https://tacobout.domoretech.net". None of these licenses grant any right to
Taco Bell's name or trademarks.

## Where things are

- `index.html`, `app.js`, `dashboard.css`, `styles.css`: the price map and dashboard.
- `coin-spinner.html` and `assets/game/`: Coin Spinner. The physics, drawing and
  sound are all in [`assets/game/coin-spinner.js`](assets/game/coin-spinner.js),
  with no game engine or libraries. Add `#debug` to the page's address for a
  tuning hook in the browser console.
- `data/`: the published price summaries; `data/index.json` and `llms.txt`
  describe every file.

## Running it

It is a static site with no build step. Serve the folder and open it:

```bash
python3 -m http.server
```

Then visit http://localhost:8000. Opening `index.html` straight from disk does
not work, because the page fetches its data as JSON.

The price collector that produces `data/` is not part of this repository.
