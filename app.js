/* The Taco Bell Price Map — all rendering, no dependencies.
   First paint needs data/dashboard.json + data/us-map.json.
   Everything else (places, price books, one item, one state's menus)
   is fetched only when the reader asks for it. */
(() => {
'use strict';

/* ---------- copy ----------
   Every word the page says lives here or in index.html, so wording can be
   changed without going looking through the rendering code. {tokens} are
   filled at call time; anything coming from the data is escaped first. */
const COPY = {
  dash_compares: "How {city} compares",
  dash_percentile: "Pricier than <strong>{pct}%</strong> of sampled restaurants.",
  dash_above: "above the typical US price for this order",
  dash_below: "below the typical US price for this order",
  dash_equal: "difference from the typical US price for this order",
  dash_lower: "Lowest",
  dash_higher: "Highest",
  dash_us_median: "Median",
  dash_vs_peers: "vs. similar-size cities",
  dash_national_median: "US median",
  dash_item_gap: "{gap} price gap",
  dash_hist_accessible: "The same 12-item order costs {min} to {max} across {n} restaurants. {city}: {price}.",
  dash_bin: "{min}–{max}: {n} restaurants",
  dash_compared_count: "Each dot is one restaurant's 12-item total · {n} restaurants",
  dash_captured: "{year} · collection date",
  dash_cities: "cities sampled",
  dash_items: "menu items found",
  dash_prices: "recorded prices",
  dash_books: "shared price books",
  dash_pause_motion: "Pause animations",
  dash_resume_motion: "Resume animations",
  answer_label_here: "12-item order total in {city}",
  answer_label_item: "{item} in {city}",
  answer_sub_peers_item: "We compare that with the median price across {n} cities with similar populations.",
  hero_pick_basket: "The same 12-item order",
  dash_above_item: "above the typical US price for this item",
  dash_below_item: "below the typical US price for this item",
  dash_equal_item: "difference from the typical US price for this item",
  dash_hist_item: "{item} costs {min} to {max} across {n} restaurants. {city}: {price}.",
  dash_compared_item: "Each dot is one restaurant's {item} price · {n} restaurants",
  drive_foot_item: "Same item, before tax. Worth it only if already going.",
  band_none_item: "No other sampled restaurant charges exactly {city}'s price.",
  band_sub_item: "The same price shows up at restaurants far from {city}.",
  band_more: "+{n} more",
  answer_label_peers: "Similar-size cities",
  answer_sampled_here: "The local price is based on {n} sampled restaurants in {city}.",
  answer_sampled_near: "The local price is based on {n} nearby sampled restaurants.",
  answer_sub_peers: "We compare that with the median total across {n} cities with similar populations.",
  answer_sub_peers_none: "There are not enough similar-size cities to make a comparison.",
  band_label: "Price band",
  band_none: "Your total is unique to {city}.",
  band_sub: "Same total shows up at restaurants hundreds of miles from {city}.",
  band_value: "{stores} locations across {states} states",
  bands_chip: "{n} totals",
  bands_fact_stores: "Restaurants",
  bands_fact_top20: "Top 20 cover",
  bands_fact_totals: "Distinct totals",
  bands_punchline: "Restaurants cluster on a handful of shared totals, not individual prices.",
  bands_sub: "Places charging the exact same price.",
  bands_title: "Franchise price bands",
  books_caveat: "Detected by analyzing prices. Not official Taco Bell data.",
  books_chip: "{n} books",
  books_do: "Tap a price book to highlight it on the map.",
  books_fact_biggest: "Biggest group",
  books_fact_found: "Price books",
  books_fact_grouped: "Restaurants grouped",
  books_fact_items: "Items matched",
  books_sub: "Groups of restaurants using the same pricing.",
  books_title: "Price books",
  caveats_1: "Prices are from Taco Bell's online pickup ordering. In-store and delivery prices may differ.",
  caveats_1_head: "Online pickup prices",
  caveats_2: "Before tax, coupons, app deals, and combo offers.",
  caveats_2_head: "Before tax and deals",
  caveats_3: "Sample data, not a full census. Small-sample states may swing around.",
  caveats_3_head: "It's a sample",
  caveats_4: "A restaurant only gets a total if it sells all 12 items. No guessing.",
  caveats_4_head: "No guessed prices",
  caveats_5: "Franchisees set their own prices. Two locations in the same city can differ.",
  caveats_5_head: "Franchisees differ",
  caveats_6: "Independent research. Not affiliated with Taco Bell or Yum! Brands.",
  caveats_6_head: "Not affiliated",
  caveats_title: "The fine print",
  citypick_placeholder: "Search cities...",
  citypick_sub: "Every US place with 5,000+ people.",
  citypick_title: "Find a city",
  drive_foot: "Same order, before tax. Worth it only if already going.",
  drive_here_label: "{city}",
  drive_directions: "Directions",
  drive_lead: "Drive {miles} miles to {town} and save {saving} — {pct}% off the 12-item order.",
  drive_lead_item: "Drive {miles} miles to {town} and save {saving} — {pct}% off the {item}.",
  drive_none_body: "No cheaper Taco Bell within 200 miles of {city}.",
  drive_none_title: "Nowhere closer",
  drive_there_label: "{town}",
  drive_title: "Save money nearby",
  error_load: "We couldn’t load the price data. Check your connection and reload the page.",
  footer: "Prices collected {date}. Sample for research.",
  tip_price: "A Crunchy Taco runs about <strong>{price}</strong> around {city}. ",
  tip_price_us: "A Crunchy Taco runs about <strong>{price}</strong> at a typical US Taco Bell. ",
  gauge_high: "Priciest",
  gauge_low: "Cheapest",
  hero_eyebrow: "FIND OUT",
  hero_picker_hint: "Click to pick a city",
  hero_question: "Do you pay more for Taco Bell in {city}?",
  hero_question_post: "?",
  hero_question_pre: "Do you pay more for Taco Bell in ",
  hero_reset: "Back to {city}",
  item_back: "Back to order",
  item_bot_title: "Cheapest",
  item_hist_note: "Prices from {min} (left) to {max} (right).",
  item_hist_title: "Price histogram",
  item_map_off: "This item isn't on the map.",
  item_map_on: "Map now shows {item} prices.",
  item_partial: "Sold at {pct}% of locations",
  item_stat_cheapest: "Cheapest",
  item_stat_common: "Most common",
  item_stat_common_sub: "{n} restaurants charge this",
  item_stat_gap: "Price gap",
  item_stat_gap_sub: "{x} times the cheapest",
  item_stat_priciest: "Priciest",
  item_stat_typical: "Typical",
  item_stat_typical_sub: "Middle price",
  item_stat_variants: "Variants",
  item_stat_variants_sub: "Found at {n} restaurants",
  item_sub: "{category}, {n} restaurants ({pct}% coverage)",
  item_tap: "Tap for details",
  item_top_title: "Most expensive",
  items_chip: "{n} items",
  items_sort_gap: "Price range",
  items_sort_label: "Sort",
  items_sort_max: "Highest price",
  items_sort_name: "Alphabetical",
  items_sort_typical: "Typical price",
  items_sub: "Dig into individual prices.",
  items_title: "By menu item",
  legend_hint_states: "{item} ranges from {min} to {max}.",
  legend_hint_stores: "{item} costs {min} to {max} in sample restaurants.",
  less_rows: "Show less",
  desig_borough: "borough",
  desig_cdp: "CDP",
  desig_city: "",
  desig_municipality: "municipality",
  desig_note: "Place types from the US Census. Not all are cities.",
  desig_plantation: "plantation",
  desig_town: "town",
  desig_township: "township",
  desig_village: "village",
  item_scope_cities: "{item} pricing in similar cities",
  item_scope_near: "{item} at your nearest restaurants",
  item_scope_states: "{item} prices across all states",
  map_metric_basket: "12-item order",
  map_metric_label: "Show",
  map_no_reading: "No data",
  map_seg_states: "States",
  map_seg_stores: "Restaurants",
  map_sub_basket: "Tap a state or restaurant to see the price.",
  map_sub_item: "Showing prices for {item}.",
  map_title: "Prices by location",
  meta_description: "Compare Taco Bell prices at {stores} restaurants in 50 states. Find out if you're paying more where you live.",
  method_basket: "The 12-item order",
  method_books: "Price books found",
  method_chip: "{n} restaurants",
  method_cities: "Cities sampled",
  method_items: "Different menu items found",
  method_prices: "Price points taken",
  method_states: "States covered",
  method_stores: "Restaurants sampled",
  method_sub: "The research and the limits.",
  method_title: "How we did this",
  more_rows: "Show {n} more",
  near_compared: "Comparing against {n} similar cities.",
  near_geo_asking: "Finding your location...",
  near_geo_btn: "Use my location",
  near_geo_denied: "Need permission to use your location.",
  near_geo_failed: "Couldn't find your location.",
  near_geo_far: "{town} is {miles} miles away. Try a US city.",
  near_no_match: "No city found.",
  near_or: "or",
  near_placeholder: "Type a city like Denver",
  near_privacy: "Stays in your browser. No tracking.",
  nearby_cell_around: "Area",
  nearby_cell_here: "{city}",
  nearby_cell_peers: "Similar size",
  nearby_cell_pop: "Population",
  nearby_cell_us: "US median",
  nearby_chip_label: "{n} sampled here",
  nearby_far_note: "None within 35 miles. Using nearest {n}, {miles} miles away.",
  nearby_sub_nearest: "Nearest available",
  nearby_sub_peers_n: "Population {lo} to {hi}",
  nearby_sub_pop: "{city}, {state}",
  nearby_sub_reach_n: "{n} within reach",
  nearby_sub_sampled: "Sampled locations",
  nearby_sub_sampled_n: "{n} in this sample",
  nearby_sub_us: "Every restaurant sampled",
  nearby_title: "Closest restaurants in {city}",
  nearby_title_static: "Closest restaurants",
  order_label: "The order we priced",
  order_note: "Same {n} items, {stores} restaurants.",
  order_receipt_note: "The item prices are national medians. The order total is the median of complete restaurant orders.",
  order_tap: "Typical US item prices · tap for details",
  order_total: "Typical US total for this order",
  panel_empty: "No data.",
  panel_error: "Couldn't load data.",
  panel_incomplete: "Missing items",
  panel_loading: "Loading...",
  panel_not_sold: "Not sold",
  panel_note_basket: "12-item order: {amount} ({rank} of {total})",
  panel_no_match: "No restaurant here matches {q}.",
  panel_search_ph: "Search address, city or #",
  panel_shown: "{shown} of {total}",
  panel_sort_az: "City A–Z",
  panel_sort_high: "Price, high to low",
  panel_sort_label: "Sort",
  panel_sort_low: "Price, low to high",
  panel_stat_basket: "12-item total",
  panel_stat_max: "Highest",
  panel_stat_min: "Lowest",
  panel_stat_vs: "vs. US median",
  panel_sub: "{rank} of {total} states, {n} restaurants.",
  panel_vs_us: "vs US",
  peer_note: "Showing {shown} of {total} cities. Click {city} to jump to it in the ranking.",
  peers_chip: "{n} cities",
  peers_opt_all: "All similar cities",
  peers_opt_home: "In {state}",
  peers_opt_near: "Near {city}",
  peers_show_label: "Show",
  peers_sub: "Similar population, {lo} to {hi}.",
  no_item_city: "No local restaurant; price from nearby",
  no_item_note: "{n} cities have a restaurant; dashes show places without one",
  no_item_shop: "Not on menu",
  peers_sub_static: "Similar population",
  peers_title: "Cities like {city}",
  peers_title_static: "Similar-size cities",
  rank_label: "Your ranking",
  rank_state_sub: "{rank} priciest of {total} {state} cities this size.",
  rank_state_top: "The priciest of {total} {state} cities this size.",
  rank_sub: "Pricier than {pct}% of them.",
  rank_value: "{rank} priciest",
  rank_of: "of {total} cities about {city}'s size",
  site_tagline: "Not affiliated with Taco Bell or Yum!",
  site_title: "Taco Bell Price Map",
  skip_link: "Skip to content",
  states_chip: "{n} states",
  states_sub: "Price by state.",
  states_title: "All states",
  pick_hint: "Updates all prices on this page",
  pick_label: "item",
  sort_hint: "Click any column header to sort",
  th_basket: "Total",
  th_cheapest: "Cheapest",
  th_city: "City",
  th_gap: "Gap",
  th_item: "Item",
  th_people: "Pop",
  th_priciest: "Priciest",
  th_shops: "Restaurants",
  th_state: "State",
  th_typical: "Typical",
  th_vs_peers: "vs Peers",
  th_vs_us: "vs US",
  theme_toggle_label: "Toggle theme",
  tile_book: "Largest Price Group",
  tile_book_cap: "Same menu used across {states} states",
  tile_book_val: "{n} shops",
  tile_cheapest_state: "Cheapest State",
  tile_cheapest_state_cap: "Lowest total: {state}, {amount} less than {other}",
  tile_cheapest_store: "Cheapest Restaurant",
  tile_cheapest_store_cap: "Lowest price: {street}, {city}, {state}",
  tile_drink: "Fountain Drink Price",
  tile_drink_cap: "Range from {min} in {minstate} to {max} in {maxstate}",
  tile_drive: "Save by Driving",
  tile_drive_cap: "Drive {miles} miles from {from} to {to}, save on order",
  tile_priciest_item: "Priciest Item",
  tile_priciest_item_cap: "Highest single item: {item}, {city}, {state}",
  tile_priciest_state: "Most Expensive State",
  tile_priciest_state_cap: "Highest total in {state}: {vs} above US median",
  tile_priciest_store: "Priciest Restaurant",
  tile_priciest_store_cap: "Highest price: {street}, {city}, {state}",
  tile_us_middle: "US Median Price",
  tile_us_middle_cap: "Middle price across {n} restaurants in {states} states",
  tile_widest_item: "Biggest Price Spread",
  tile_widest_item_cap: "Widest range: {item} from {min} in {minstate} to {max} in {maxstate}",
  tile_widest_state: "Biggest State Spread",
  tile_widest_state_cap: "In {state}: {min} to {max} across restaurants",
  tip_no_data: "No data",
  tip_shops: "{n} restaurants",
  verdict_badge_no: "Nope",
  verdict_badge_tie: "Even",
  verdict_badge_yes: "Yep",
  verdict_no: "You're saving {amount}, {pct}% less than typical.",
  verdict_nodata: "Not enough nearby restaurants to compare. Found {n} in the area.",
  verdict_tie: "Difference is {amount}.",
  verdict_yes: "You're paying {amount} more than typical — {pct}% above cities your size.",
  you_chip: "You",
  you_chip_city: "This City",
};

const t = (key, vars) => {
  const s = COPY[key];
  if (s === undefined) return '';
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => (n === null || n === undefined) ? '—'
  : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + money(Math.abs(n)).slice(1);
const num = n => (n === null || n === undefined) ? '—' : Math.round(n).toLocaleString('en-US');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const state = {
  data: null, map: null, stores: [], cities: [], core: null,
  /* Restaurant dots are a few pixels across on a phone, too small to tap,
     so phones open on the state view instead. */
  metric: 'basket', mode: matchMedia('(max-width:680px)').matches ? 'states' : 'stores', scale: null,
  open: null, spot: null, book: null, me: null,
  panelSort: 'high', panelQuery: '',
  places: null, books: null, booksDrawn: false,
  itemCache: new Map(), stateCache: new Map(), storePrices: null,
};

/* ---------- color ---------- */
const STOPS = {
  light: ['#05bdae', '#83dacf', '#d7d7e4', '#e785cd', '#ed0795'],
  dark:  ['#3fd3c2', '#3f9a94', '#4d4455', '#c1517a', '#ff5f86'],
};
const isDark = () => (document.documentElement.dataset.theme
  || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';

function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
const stops = () => STOPS[isDark() ? 'dark' : 'light'];
function shade(t) {                       // t 0 = cheapest, 1 = dearest
  const s = stops(), x = Math.max(0, Math.min(1, t)) * (s.length - 1);
  const i = Math.min(s.length - 2, Math.floor(x));
  return mix(s[i], s[i + 1], x - i);
}

/* ---------- numbers ---------- */
function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos);
  return sorted[lo] + (sorted[Math.min(sorted.length - 1, lo + 1)] - sorted[lo]) * (pos - lo);
}
const median = vals => quantile([...vals].sort((a, b) => a - b), 0.5);

/* Diverging scale centered on the middle reading, ends clipped to the
   5th/95th percentile so one odd restaurant cannot flatten the map. */
function makeScale(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = quantile(s, 0.5);
  const lo = quantile(s, 0.05), hi = quantile(s, 0.95);
  const reach = Math.max(mid - lo, hi - mid) || 1;
  return { mid, lo: mid - reach, hi: mid + reach, min: s[0], max: s[s.length - 1],
           t: v => 0.5 + (v - mid) / (2 * reach) };
}

const R_MI = 3958.8;
function milesBetween(aLat, aLon, bLat, bLon) {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ---------- lazy data ---------- */
const grab = (() => {
  const inflight = new Map();
  return url => {
    if (!inflight.has(url)) inflight.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(url + ' → ' + r.status);
      return r.json();
    }));
    return inflight.get(url);
  };
})();

/* The restaurant list and the city list are the two big tables. Neither is
   needed to draw the first screen, so they arrive just behind it. */
function loadCore() {
  if (state.core) return state.core;
  const rows = (data, cols) => data.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
  state.core = Promise.all([grab('data/stores.json'), grab('data/cities.json')])
    .then(([st, ci]) => {
      state.stores = rows(st, state.data.store_columns);
      state.cities = rows(ci, state.data.city_columns);
      return state;
    });
  return state.core;
}

const loadPlaces = () => state.places ? Promise.resolve(state.places)
  : grab('data/places.json').then(p => (state.places = p));
const loadBooks = () => state.books ? Promise.resolve(state.books)
  : grab('data/books.json').then(b => (state.books = b));
const slug = code => String(code).replace(/[^A-Za-z0-9_-]/g, '_');
const loadItem = code => state.itemCache.has(code) ? Promise.resolve(state.itemCache.get(code))
  : grab(`data/item/${slug(code)}.json`).then(d => { state.itemCache.set(code, d); return d; });
const loadStateMenus = code => state.stateCache.has(code) ? Promise.resolve(state.stateCache.get(code))
  : grab(`data/state/${code}.json`).then(d => { state.stateCache.set(code, d); return d; });

/* Per-restaurant item prices live in the 51 per-state files. Only the
   restaurant view of a single item needs them, so they load on demand. */
function loadAllStoreMenus() {
  if (state.storePrices) return Promise.resolve(state.storePrices);
  const codes = state.data.states.map(s => s.code);
  return Promise.all(codes.map(loadStateMenus)).then(parts => {
    const all = new Map();
    parts.forEach(p => Object.entries(p).forEach(([id, prices]) => all.set(id, prices)));
    state.storePrices = all;
    return all;
  });
}

/* ---------- metric plumbing ---------- */
function metricLabel() {
  if (state.metric === 'basket') return t('map_metric_basket');
  const it = state.data.items.find(i => i.code === state.metric);
  return it ? it.name : state.metric;
}
function stateValue(s) {
  if (state.metric === 'basket') return s.basket;
  const it = state.itemCache.get(state.metric);
  return it ? (it.by_state[s.code] ?? null) : null;
}
function storeValue(st) {
  if (state.metric === 'basket') return st.basket;
  const at = state.data.featured.indexOf(state.metric);
  if (at < 0 || !state.storePrices) return null;
  const row = state.storePrices.get(st.id);
  return row ? (row[at] ?? null) : null;
}

/* The Census names every place by its legal type, and about one in nine of the
   places priced here is not a city: 98 towns, 91 villages, 28 boroughs. The
   place index carries that word so the page stops calling a village a city. */
const DESIG_KEY = {
  city: 'desig_city', town: 'desig_town', village: 'desig_village',
  borough: 'desig_borough', municipality: 'desig_municipality',
  township: 'desig_township', plantation: 'desig_plantation', CDP: 'desig_cdp',
};
function desigOf(name, st) {
  if (!state.places) return '';
  if (!state.desig) {
    state.desig = new Map();
    for (const p of state.places.places) if (p[5]) state.desig.set(`${p[0]}|${p[1]}`, p[5]);
  }
  return state.desig.get(`${name}|${st}`) || '';
}
/* Renders as ' village' after the name, or nothing when the Census gives no
   type and for the 94% of store towns the index does not reach. */
function desigTag(place) {
  const word = t(DESIG_KEY[desigOf(place.city ?? place.name, place.state)] || '');
  return word ? ` <span class="desig">${esc(word)}</span>` : '';
}

/* A city's price for a single item is the middle price across the restaurants
   standing in that city. 365 of the 2,084 places in the study have no Taco Bell
   of their own — their order total came from the nearest one in a neighboring
   town — so on a single item those report nothing rather than borrow a figure
   from somewhere else. */
function storesByCity() {
  if (state.byCity) return state.byCity;
  const m = new Map();
  for (const s of state.stores || []) {
    const k = `${s.city}|${s.state}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(s);
  }
  state.byCity = m;
  return m;
}
const midOf = vals => vals.length ? Math.round(median(vals) * 100) / 100 : null;
const shopValues = shops => midOf(shops
  .map(n => storeValue(n.s !== undefined ? n.s : n))
  .filter(v => v !== null && v !== undefined));

function cityValue(c) {
  if (state.metric === 'basket') return c.basket ?? null;
  return shopValues(storesByCity().get(`${c.city}|${c.state}`) || []);
}

/* The four copies of the item picker are one setting. Whichever one you use,
   they all move together and every section that can honor it redraws. */
function fillPickers() {
  const d = state.data;
  const html = `<option value="basket">${esc(t('map_metric_basket'))}</option>`
    + d.featured.map(c => {
        const it = d.items.find(i => i.code === c);
        return it ? `<option value="${esc(c)}">${esc(it.name)}</option>` : '';
      }).join('');
  $$('#metric, .metric-pick').forEach(sel => { sel.innerHTML = html; sel.value = state.metric; });
  $('#hero-metric').options[0].textContent = t('hero_pick_basket');
}
function syncPickers() {
  $$('#metric, .metric-pick').forEach(sel => { if (sel.value !== state.metric) sel.value = state.metric; });
}

/* ---------- map ---------- */
const SVG = 'http://www.w3.org/2000/svg';

/* Pan and zoom are hand-rolled on the viewBox, because the site loads no
   mapping library and the geometry was already projected into a fixed
   960x600 world at build time. Zooming is just a smaller window onto it. */
const MAP_W = 960, MAP_H = 600, MAX_K = 14;
const view = { x: 0, y: 0, w: MAP_W, h: MAP_H };
const zoomK = () => MAP_W / view.w;

function clampView() {
  view.w = Math.min(MAP_W, Math.max(MAP_W / MAX_K, view.w));
  view.h = view.w * (MAP_H / MAP_W);
  view.x = Math.min(MAP_W - view.w, Math.max(0, view.x));
  view.y = Math.min(MAP_H - view.h, Math.max(0, view.y));
}

let viewQueued = false;
function applyView() {
  if (viewQueued) return;
  viewQueued = true;
  requestAnimationFrame(() => {
    viewQueued = false;
    const svg = $('#map');
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    /* Dots, labels and borders are drawn in world units, so a 4x zoom would
       draw them 4x fat. The stylesheet divides every such size by this. */
    const k = zoomK();
    svg.style.setProperty('--z', k.toFixed(4));
    /* counter-scaling alone pins every marker to one on-screen size; this
       lets them grow part of the way with the zoom so a street-level view
       reads as restaurants rather than specks */
    svg.style.setProperty('--mk', Math.min(1.9, 1 + 0.26 * Math.log2(k)).toFixed(3));
    svg.parentElement.classList.toggle('zoomed', zoomK() > 1.02);
    revealDots();
  });
}

function resetView() {
  view.x = 0; view.y = 0; view.w = MAP_W; view.h = MAP_H;
  clampView(); applyView();
}

/* Every restaurant is drawn, but at the national view 2,357 of them land on
   top of each other. Each one is given the zoom at which it earns its own
   space: walk from coarse to fine, keeping a dot only where its cell in a
   grid that shrinks with the zoom is still free. Busier cities are offered
   the cell first, so zooming out leaves the metros standing rather than
   whichever restaurant happened to be first in the file. The finest level
   takes everything left over, so full zoom really does show all of them. */
const DOT_LEVELS = [1, 1.6, 2.5, 4, 6.5, 10, MAX_K];
const DOT_GAP = 20;
function dotLevels() {
  if (state.dotLevels) return state.dotLevels;
  const order = state.stores
    .filter(s => s.x !== null && s.x !== undefined)
    .sort((a, b) => (b.pop || 0) - (a.pop || 0) || String(a.id).localeCompare(String(b.id)));
  const at = new Map();
  for (let i = 0; i < DOT_LEVELS.length; i++) {
    const cell = DOT_GAP / DOT_LEVELS[i], last = i === DOT_LEVELS.length - 1;
    const key = s => `${Math.round(s.x / cell)},${Math.round(s.y / cell)}`;
    const taken = new Set();
    for (const s of order) if (at.has(s.id)) taken.add(key(s));
    for (const s of order) {
      if (at.has(s.id)) continue;
      const k = key(s);
      if (last || !taken.has(k)) { taken.add(k); at.set(s.id, DOT_LEVELS[i]); }
    }
  }
  state.dotLevels = at;
  return at;
}

let dotBand = -1;
function revealDots(force) {
  const g = $('#map-dots');
  if (state.mode !== 'stores' || !g.children.length) return;
  const k = zoomK();
  const band = DOT_LEVELS.filter(L => L <= k + 1e-6).length;
  if (!force && band === dotBand) return;
  dotBand = band;
  for (const c of g.children) c.classList.toggle('off', Number(c.dataset.lvl) > k + 1e-6);
}

function drawMap() {
  const g = $('#map-states'), gl = $('#map-labels'), gd = $('#map-leaders');
  g.innerHTML = gl.innerHTML = gd.innerHTML = '';
  const byCode = Object.fromEntries(state.data.states.map(s => [s.code, s]));
  const quiet = state.mode === 'stores';

  for (const geo of state.map.states) {
    const rec = byCode[geo.code];
    const v = rec ? stateValue(rec) : null;
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', geo.d);
    path.setAttribute('class', 'st' + (quiet ? ' quiet' : v === null ? ' nodata' : ''));
    path.dataset.code = geo.code;
    // inline style, not the fill attribute: the stylesheet's `fill` would win over it
    if (v !== null && !quiet) path.style.fill = shade(state.scale.t(v));
    path.setAttribute('tabindex', rec ? '0' : '-1');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label',
      `${geo.name}${v === null ? ', ' + t('tip_no_data') : ', ' + money(v)}`);
    g.appendChild(path);

    const outboard = geo.lx !== undefined;
    if (outboard) {
      const line = document.createElementNS(SVG, 'path');
      line.setAttribute('class', 'lead');
      line.setAttribute('d', `M${geo.cx},${geo.cy}L${geo.lx},${geo.ly}`);
      gd.appendChild(line);
    }
    const area = (geo.bbox[2] - geo.bbox[0]) * (geo.bbox[3] - geo.bbox[1]);
    if (outboard || area > 900) {
      const tx = document.createElementNS(SVG, 'text');
      tx.setAttribute('class', 'lbl' + (outboard || quiet ? ' out' : ''));
      tx.setAttribute('x', outboard ? geo.lx : geo.cx);
      tx.setAttribute('y', outboard ? geo.ly : geo.cy);
      tx.textContent = geo.code;
      gl.appendChild(tx);
    }
  }
  drawDots();
  drawPin();
  $('#map-empty').hidden = state.mode === 'stores'
    || state.data.states.some(s => stateValue(s) !== null);
}

function drawDots() {
  const g = $('#map-dots');
  g.innerHTML = '';
  if (state.mode !== 'stores') return;
  const here = state.city && state.city.me;
  const lvl = dotLevels();
  for (const s of state.stores) {
    if (s.x === null || s.x === undefined) continue;
    const v = storeValue(s);
    const c = document.createElementNS(SVG, 'circle');
    c.setAttribute('cx', s.x); c.setAttribute('cy', s.y);
    const mine = here && s.city === here.name && s.state === here.state;
    /* the attribute is the fallback size; the stylesheet's counter-scaled
       `r` overrides it wherever CSS geometry properties are supported */
    c.setAttribute('r', mine ? 4.4 : 3.2);
    c.setAttribute('class', 'dot-shop' + (mine ? ' me' : '')
      + (state.book !== null && s.book !== state.book ? ' dim' : '')
      + (state.book !== null && s.book === state.book ? ' hl' : ''));
    c.style.fill = v === null ? 'var(--ink-3)' : shade(state.scale.t(v));
    c.dataset.id = s.id;
    c.dataset.lvl = lvl.get(s.id) ?? 1;
    g.appendChild(c);
  }
  dotBand = -1;
  revealDots(true);
}

function drawPin() {
  const g = $('#map-pin');
  g.innerHTML = '';
  const me = state.me;
  if (!me || me.x === null || me.x === undefined) return;
  const ring = document.createElementNS(SVG, 'circle');
  ring.setAttribute('cx', me.x); ring.setAttribute('cy', me.y);
  ring.setAttribute('r', 9); ring.setAttribute('class', 'pin');
  const core = document.createElementNS(SVG, 'circle');
  core.setAttribute('cx', me.x); core.setAttribute('cy', me.y);
  core.setAttribute('r', 3.4); core.setAttribute('class', 'pin-core');
  g.append(ring, core);
}

/* The map was projected at build time, so there is no projection to run here.
   Fitting a small plane through the nearest priced restaurants puts a pin
   within a pixel or two of where the real projection would put it. */
function projectLocal(lat, lon) {
  const anchors = state.stores
    .filter(s => s.x !== null && s.x !== undefined)
    .map(s => ({ s, d: (s.lat - lat) ** 2 + ((s.lon - lon) * 0.75) ** 2 }))
    .sort((a, b) => a.d - b.d).slice(0, 12).map(a => a.s);
  if (!anchors.length) return null;
  const solve = pick => {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    for (const s of anchors) {
      const r = [1, s.lon - lon, s.lat - lat], y = pick(s);
      for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += r[i] * r[j]; b[i] += r[i] * y; }
    }
    for (let i = 0; i < 3; i++) {                       // Gaussian elimination
      let p = i;
      for (let k = i + 1; k < 3; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
      if (Math.abs(A[p][i]) < 1e-9) return null;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      for (let k = i + 1; k < 3; k++) {
        const f = A[k][i] / A[i][i];
        for (let j = i; j < 3; j++) A[k][j] -= f * A[i][j];
        b[k] -= f * b[i];
      }
    }
    const x = [0, 0, 0];
    for (let i = 2; i >= 0; i--) {
      let acc = b[i];
      for (let j = i + 1; j < 3; j++) acc -= A[i][j] * x[j];
      x[i] = acc / A[i][i];
    }
    return x[0];                                        // value at the pin itself
  };
  const x = solve(s => s.x), y = solve(s => s.y);
  return (x === null || y === null) ? { x: anchors[0].x, y: anchors[0].y } : { x, y };
}

function drawLegend() {
  const sc = state.scale, el = $('#legend');
  const swatches = Array.from({ length: 28 }, (_, i) => `<i style="background:${shade(i / 27)}"></i>`).join('');
  /* The ramp ends are a trimmed band around the median, not the extremes, so the
     true low and high still have to be said. Everything else the picture shows. */
  const hint = t(state.mode === 'stores' ? 'legend_hint_stores' : 'legend_hint_states',
    { item: esc(metricLabel()), min: money(sc.min), max: money(sc.max) });
  el.innerHTML = `
    <span class="cap">${money(sc.lo)}</span>
    <span class="ramp" aria-hidden="true">${swatches}</span>
    <span class="cap">${money(sc.hi)}</span>
    <span class="hint">${hint}</span>`;
}

/* ---------- tooltip ---------- */
const tip = $('#tip');
function placeTip(html, x, y) {
  tip.innerHTML = html;
  const box = $('.map-holder').getBoundingClientRect();
  tip.style.left = Math.max(70, Math.min(box.width - 70, x - box.left)) + 'px';
  tip.style.top = (y - box.top) + 'px';
  tip.hidden = false;
}
function showStateTip(code, x, y) {
  const rec = state.data.states.find(s => s.code === code);
  if (!rec) return hideTip();
  const v = stateValue(rec);
  placeTip(`<b>${esc(rec.name)}</b><i>${v === null ? t('tip_no_data')
    : money(v) + ' · ' + t('tip_shops', { n: num(rec.stores) })}</i>`, x, y);
}
function showStoreTip(id, x, y) {
  const s = state.stores.find(t2 => t2.id === id);
  if (!s) return hideTip();
  const v = storeValue(s);
  placeTip(`<b>${esc(s.city)}, ${esc(s.state)}</b><i>${esc(s.street || 'Taco Bell')} · ${
    v === null ? t('tip_no_data') : money(v)}</i>`, x, y);
}
const hideTip = () => { tip.hidden = true; };

/* ---------- the city the page is about ---------- */
/* Every city goes through the same analysis, including the one the study was
   written around. Nothing about a city is frozen at build time: the page is
   assembled in the browser from that week's collection, so the default city's
   numbers move each Monday exactly like anyone else's. */

function nearestPlace(lat, lon) {
  let best = null, bestMi = Infinity;
  for (const p of state.places.places) {
    const mi = milesBetween(lat, lon, p[3], p[4]);
    if (mi < bestMi) { bestMi = mi; best = p; }
  }
  return best && { name: best[0], state: best[1], pop: best[2], lat: best[3], lon: best[4], away: bestMi };
}

const asPlace = p => ({ name: p[0], state: p[1], pop: p[2], lat: p[3], lon: p[4] });

/* Type-ahead over every incorporated place of 5,000 or more. An empty box
   offers the largest cities, which is the most useful thing to show first. */
function matchPlaces(q, n = 8) {
  if (!state.places) return [];
  const s = String(q || '').trim().toLowerCase();
  if (!s) return state.places.places.slice(0, n);
  const [name, st] = s.split(',').map(x => x.trim());
  const hit  = p => p[0].toLowerCase().startsWith(name) && (!st || p[1].toLowerCase().startsWith(st));
  const soft = p => p[0].toLowerCase().includes(name)   && (!st || p[1].toLowerCase().startsWith(st));
  const seen = new Set();
  return [...state.places.places.filter(hit), ...state.places.places.filter(soft)]
    .filter(p => { const k = p[0] + p[1]; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, n);
}

/* Peers are cities of a similar size. Start at roughly two-thirds to
   one-and-two-thirds of the city's population and widen until enough
   sampled cities fall inside the band to be worth comparing against. */
function sizeBand(pop) {
  const priced = state.cities.filter(c => c.basket !== null && c.basket !== undefined);
  let lo = pop * 0.6, hi = pop * 1.7, peers = [];
  for (let i = 0; i < 10; i++) {
    peers = priced.filter(c => c.pop >= lo && c.pop <= hi);
    if (peers.length >= 20) break;
    lo /= 1.35; hi *= 1.35;
  }
  return { peers, lo: Math.max(0, lo), hi };
}

/* Everything here runs on whatever the picker is set to: the 12-item order,
   or one menu item priced at each restaurant. The peers stay the same cities
   either way; on an item, a peer with none of its own restaurants selling it
   drops out of the comparison rather than borrowing a price. */
function analyzeCity(me, metric = state.metric) {
  const item = metric !== 'basket';
  const sv = item ? storeValue : s => s.basket;
  const cv = item ? cityValue : c => c.basket ?? null;
  const shops = state.stores
    .map(s => ({ s, v: sv(s) }))
    .filter(n => n.v !== null && n.v !== undefined)
    .map(n => ({ ...n, mi: milesBetween(me.lat, me.lon, n.s.lat, n.s.lon) }))
    .sort((a, b) => a.mi - b.mi);
  if (!shops.length) return null;

  /* A city that is itself in the sample answers for itself, so the headline
     agrees to the cent with every table further down the page. Anywhere else
     leans on the counters around it and the page says so. */
  const exact = state.cities.find(c => c.city === me.name && c.state === me.state
    && cv(c) !== null);
  const own = exact ? shops.filter(n => n.s.city === me.name && n.s.state === me.state) : [];
  const close = shops.filter(n => n.mi <= 35);
  const use = own.length ? own : close.length ? close.slice(0, 8) : shops.slice(0, 3);
  const basket = exact ? cv(exact) : midOf(use.map(n => n.v));

  const { peers, lo, hi } = sizeBand(me.pop);
  const vals = peers.map(cv).filter(v => v !== null);
  const med = vals.length ? median(vals) : null;
  const pct = vals.length ? Math.round(vals.filter(v => v < basket).length / vals.length * 100) : null;
  const rank = vals.length ? vals.filter(v => v > basket).length + 1 : null;
  const kin = peers.filter(c => c.state === me.state).map(cv).filter(v => v !== null);

  return {
    me, shops, use, basket, exact, peers, kin, lo, hi, med, pct, rank, item, ranked: vals.length,
    kinRank: kin.length >= 3 ? kin.filter(v => v > basket).length + 1 : null,
    shopCount: exact ? (item ? own.length : exact.stores) : use.length,
    sampled: !!close.length, far: Math.round(shops[0].mi),
  };
}

/* The one place the page changes what it is about. Everything city-shaped is
   redrawn from the single analysis, so no two parts of the page can disagree. */
function setCity(me, opts = {}) {
  if (!state.stores.length) { loadCore().then(() => setCity(me, opts)); return; }
  const a = analyzeCity(me);
  if (!a) return;
  state.city = a;
  state.orderDrive = cityDrive(a.item ? analyzeCity(me, 'basket') : a);
  state.me = { ...me, ...(projectLocal(me.lat, me.lon) || {}) };
  drawPin();
  paintHero(cityHero(a));
  renderTiles();
  renderTiers();
  renderPeers();
  renderNearby(a);
  renderDashboard();
  if (opts.scroll !== false) $('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* The city the page opens on has to resolve through the same place index every
   searched city resolves through. The reference record's coordinates are the
   middle of its own sampled restaurants, 3.4 miles from the Census center of
   Jackson, which was enough to move the drive-to-save figure between 15 and 18
   miles depending on whether you landed on the city or typed its name in. */
function homeCity() {
  const r = state.data.reference;
  const hit = state.places
    && state.places.places.find(p => p[0] === r.city && p[1] === r.state);
  return hit ? asPlace(hit)
    : { name: r.city, state: r.state, pop: r.pop, lat: r.lat, lon: r.lon };
}

/* ---------- the restaurants around the chosen city ---------- */
/* A fold under the answer. The headline above already gave the verdict, so
   this is the list, not a second opinion. */
function renderNearby(a) {
  const box = $('#near-result');
  if (!a) { box.innerHTML = ''; return; }
  const me = a.me, nat = state.data.meta.national_basket_median;
  const item = state.metric !== 'basket';
  const itRec = item ? state.data.items.find(i => i.code === state.metric) : null;
  const hereV = item ? shopValues(a.use) : a.basket;
  const peerV = item ? midOf(a.peers.map(cityValue).filter(v => v !== null)) : a.med;
  const natV = item ? (itRec ? itRec.median : null) : nat;
  const shopV = s => (item ? storeValue(s) : s.basket);

  $('#nearby-title').textContent = t('nearby_title', { city: me.name });
  $('#nearby-sub').textContent = item
    ? t('item_scope_near', { item: metricLabel() })
    : t(a.exact ? 'nearby_sub_sampled' : 'nearby_sub_nearest');
  $('#near-pick-hint').textContent = t('pick_hint');
  $('#nearby-chip').textContent = t('nearby_chip_label',
    { n: num(a.exact ? a.shopCount : a.use.length) });

  const cells = [
    [a.exact ? t('nearby_cell_here', { city: esc(me.name) }) : t('nearby_cell_around'),
     money(hereV),
     a.exact ? t('nearby_sub_sampled_n', { n: num(a.shopCount) })
             : t('nearby_sub_reach_n', { n: num(a.use.length) })],
    [t('nearby_cell_peers'), money(peerV), t('nearby_sub_peers_n', { lo: num(a.lo), hi: num(a.hi) })],
    [t('nearby_cell_us'), money(natV), t('nearby_sub_us')],
    [t('nearby_cell_pop'), num(me.pop), t('nearby_sub_pop', { city: esc(me.name), state: esc(me.state) })],
  ];
  box.innerHTML = `
    ${a.sampled ? '' : `<p class="nr-verdict">${
       t('nearby_far_note', { n: num(a.use.length), miles: num(a.far) })}</p>`}
    <div class="nr-grid">${cells.map(([k, v, w]) =>
      `<div><div class="k">${k}</div><div class="v">${v}</div><div class="sm">${w}</div></div>`).join('')}</div>
    <div class="nr-list">${a.shops.slice(0, 6).map(({ s, mi }) => {
      const v = shopV(s);
      return `
      <div class="nr-shop clickable" data-code="${s.state}" tabindex="0">
        <span class="dist">${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi</span>
        <span class="who"><b>${esc(s.street || 'Taco Bell')}</b>
          <span>${esc(s.city)}${desigTag(s)}, ${esc(s.state)} · #${esc(s.id)}</span></span>
        ${v === null || v === undefined
          ? `<span class="amt none">${esc(t('no_item_shop'))}</span>`
          : `<span class="amt" style="color:${shade(state.scale.t(v))}">${money(v)}</span>`}
      </div>`; }).join('')}</div>`;
}

/* A type-ahead over every US place, used by the city picker. */
function wireSuggest({ input, list, onPick, openEmpty = false, limit = 8 }) {
  let items = [], cursor = -1;
  const paint = () => $$('li[role="option"]', list).forEach((li, i) =>
    li.setAttribute('aria-selected', i === cursor ? 'true' : 'false'));
  const shut = () => { list.hidden = true; items = []; cursor = -1; };
  const fill = () => {
    const q = input.value.trim();
    if (!openEmpty && q.length < 2) return shut();
    loadPlaces().then(() => {
      items = matchPlaces(q, limit);
      list.innerHTML = items.length
        ? items.map(p => `<li role="option" aria-selected="false"><b>${esc(p[0])}${
              p[5] ? ` <span class="desig">${esc(t(DESIG_KEY[p[5]] || ''))}</span>` : ''
            }, ${esc(p[1])}</b>`
            + `<span>${num(p[2])}</span></li>`).join('')
        : `<li class="empty">${t('near_no_match')}</li>`;
      list.hidden = false; cursor = -1;
    });
  };
  const choose = i => { const p = items[i]; if (!p) return; shut(); onPick(asPlace(p)); };

  input.addEventListener('input', fill);
  input.addEventListener('focus', () => { if (openEmpty || items.length) fill(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return fill();
      cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      paint();
      $$('li[role="option"]', list)[cursor].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault(); choose(cursor < 0 ? 0 : cursor);
    } else if (e.key === 'Escape') shut();
  });
  list.addEventListener('mousedown', e => {
    const li = e.target.closest('li[role="option"]');
    if (li) { e.preventDefault(); choose($$('li[role="option"]', list).indexOf(li)); }
  });
  return { fill, shut };
}

const sayGeo = (msg, warn) => {
  const el = $('#geo-status');
  el.textContent = msg;
  el.classList.toggle('warn', !!warn);
};

/* The city in the headline is the only way the page changes what it is about,
   so both ways of naming a city — the browser's location and a search box —
   live in the dialog behind it. */
function wireCityPicker() {
  const dlg = $('#city-pick'), scrim = $('#city-scrim'), input = $('#city-input');
  const sug = wireSuggest({
    input, list: $('#city-list'), openEmpty: true, limit: 40,
    onPick: place => { shut(); setCity(place, { scroll: false }); },
  });

  function open() {
    loadPlaces().then(() => {
      dlg.hidden = false; scrim.hidden = false;
      document.body.classList.add('locked');
      sayGeo(t('near_privacy'), false);
      input.value = '';
      sug.fill();
      input.focus();
    });
  }
  function shut() {
    dlg.hidden = true; scrim.hidden = true;
    document.body.classList.remove('locked');
    $('#hero-place').focus();
  }

  $('#hero-place').addEventListener('click', open);
  $('#city-close').addEventListener('click', shut);
  scrim.addEventListener('click', shut);
  dlg.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });

  $('#geo-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return sayGeo(t('near_geo_failed'), true);
    sayGeo(t('near_geo_asking'), false);
    $('#geo-btn').disabled = true;
    navigator.geolocation.getCurrentPosition(pos => {
      Promise.all([loadPlaces(), loadCore()]).then(() => {
        $('#geo-btn').disabled = false;
        const p = nearestPlace(pos.coords.latitude, pos.coords.longitude);
        if (!p) return sayGeo(t('near_geo_failed'), true);
        if (p.away > 120) return sayGeo(
          t('near_geo_far', { town: p.name, miles: num(p.away) }), true);
        shut();
        setCity(p);
      });
    }, err => {
      $('#geo-btn').disabled = false;
      sayGeo(t(err.code === 1 ? 'near_geo_denied' : 'near_geo_failed'), true);
    }, { timeout: 10000, maximumAge: 600000 });
  });

  $('#near-result').addEventListener('click', e => {
    const row = e.target.closest('[data-code]');
    if (row) openState(row.dataset.code);
  });
}

/* ---------- one item, up close ---------- */
function openSpotlight(code) {
  const meta = state.data.items.find(i => i.code === code);
  if (!meta || !meta.detail) return;
  loadItem(code).then(det => {
    state.spot = code;
    const sec = $('#spotlight-section');
    $('#sl-name').textContent = meta.name;

    const prices = det.hist.map(h => h[0]);
    const sc = makeScale(det.hist.flatMap(h => Array(Math.min(h[1], 50)).fill(h[0])));
    const common = det.hist.slice().sort((a, b) => b[1] - a[1])[0];
    const stats = [
      [t('item_stat_typical'), money(meta.median), t('item_stat_typical_sub')],
      [t('item_stat_cheapest'), money(meta.min),
        `${esc(meta.cheapest_at.city)}, ${esc(meta.cheapest_at.state)}`],
      [t('item_stat_priciest'), money(meta.max),
        `${esc(meta.priciest_at.city)}, ${esc(meta.priciest_at.state)}`],
      [t('item_stat_gap'), money(meta.spread),
        t('item_stat_gap_sub', { x: (meta.max / meta.min).toFixed(1) })],
      [t('item_stat_variants'), String(det.hist.length),
        t('item_stat_variants_sub', { n: num(meta.stores) })],
      [t('item_stat_common'), money(common[0]),
        t('item_stat_common_sub', { n: num(common[1]) })],
    ];
    $('#sl-stats').innerHTML = stats.map(([k, v, w]) =>
      `<div><div class="k">${k}</div><div class="v">${v}</div><div class="w">${w}</div></div>`).join('');

    const tall = Math.max(...det.hist.map(h => h[1]));
    $('#sl-hist').innerHTML = det.hist.map(([p, n]) =>
      `<i style="height:${Math.max(2, n / tall * 100)}%;background:${shade(sc.t(p))}"
          title="${money(p)} — ${plural(n, 'restaurant')}"></i>`).join('');
    $('#sl-hist-note').textContent = t('item_hist_note',
      { min: money(prices[0]), max: money(prices[prices.length - 1]) });

    const rows = Object.entries(det.by_state)
      .map(([st, v]) => ({ st, v, n: det.state_counts[st] || 0 }))
      .sort((a, b) => b.v - a.v);
    const name = c => (state.data.states.find(s => s.code === c) || {}).name || c;
    const li = r => `<li><span>${esc(name(r.st))} <small class="sm">${
      t('tip_shops', { n: num(r.n) })}</small></span>
      <span class="pr" style="color:${shade(sc.t(r.v))}">${money(r.v)}</span></li>`;
    $('#sl-top').innerHTML = rows.slice(0, 6).map(li).join('');
    $('#sl-bot').innerHTML = rows.slice(-6).reverse().map(li).join('');

    const onMap = state.data.featured.includes(code);
    $('#sl-sub').textContent = t('item_sub', {
      category: meta.category, n: num(meta.stores), pct: Math.round(meta.coverage * 100),
    }) + ' · ' + t(onMap ? 'item_map_on' : 'item_map_off', { item: meta.name });

    sec.hidden = false;
    if (onMap) {
      state.metric = code;
      syncPickers();
      ensureMetricData();
    }
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }).catch(err => console.error(err));
}

function closeSpotlight() {
  state.spot = null;
  $('#spotlight-section').hidden = true;
  state.metric = 'basket';
  syncPickers();
  repaint();
}

/* ---------- price books ---------- */
function renderBooks() {
  if (state.booksDrawn) return;
  state.booksDrawn = true;
  loadBooks().then(books => {
    const top = books.slice(0, 14);
    const sc = makeScale(books.map(b => b.sum));
    $('#books').innerHTML = top.map(b => `
      <div class="book${state.book === b.id ? ' on' : ''}" data-book="${b.id}" tabindex="0" role="button">
        <span class="swatch" style="background:${shade(sc.t(b.sum))}"></span>
        <span class="states">${b.states.join(' · ')}</span>
        <span class="cnt">${b.stores}<small>shops</small></span>
        <span class="where">${esc(b.towns.slice(0, 5).join(' · '))}${
          b.town_count > 5 ? ` +${b.town_count - 5}` : ''}</span>
      </div>`).join('');
    const biggest = books[0];
    $('#book-facts').innerHTML = `
      <div class="facts">
        ${factTile(num(state.data.meta.book_item_count), t('books_fact_items'))}
        ${factTile(num(state.data.book_count), t('books_fact_found'))}
        ${factTile(num(state.data.meta.stores_with_full_basket), t('books_fact_grouped'))}
        ${factTile(num(biggest.stores), t('books_fact_biggest'),
          biggest.states.map(stateName).join(', '))}
      </div>
      <p class="facts-do">${t('books_do')}</p>`;
    $('#book-caveat').textContent = t('books_caveat');
  }).catch(() => {
    state.booksDrawn = false;
    $('#books').innerHTML = `<p class="empty">${t('panel_error')}</p>`;
  });
}

function pickBook(id) {
  state.book = state.book === id ? null : id;
  if (state.book !== null && state.mode !== 'stores') setMode('stores');
  else { drawDots(); }
  $$('#books .book').forEach(el => el.classList.toggle('on', +el.dataset.book === state.book));
  if (state.book !== null) $('#map-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- tables ---------- */
/* Long tables open on a handful of rows with the rest behind a button, so no
   section can quietly become two hundred lines of figures. The highlighted row
   — the reader's own state or city — is never one of the hidden ones. */
const ROW_CAP = 12;
function capRows(tableSel, btnSel) {
  const table = $(tableSel), btn = $(btnSel);
  if (!btn) return;
  const rows = $$('tbody tr', table);
  table.classList.remove('all');
  btn.classList.remove('open');
  let hidden = 0;
  rows.forEach((tr, i) => {
    const past = i >= ROW_CAP && !tr.classList.contains('you');
    tr.classList.toggle('past', past);
    if (past) hidden++;
  });
  btn.hidden = hidden === 0;
  btn.dataset.hidden = hidden;
  if (hidden) btn.textContent = t('more_rows', { n: num(hidden) });
}
/* Every table sorts the same way: click a header to sort by it, click again to
   turn it around. The render function decides what each key means; this only
   remembers which header is lit and which way it points, so a re-render for any
   other reason keeps the order the reader chose. */
function wireSort(tableSel, render) {
  const heads = $$(`${tableSel} th.sortable`);
  heads.forEach(th => th.addEventListener('click', () => {
    const was = th.getAttribute('aria-sort');
    heads.forEach(o => o.removeAttribute('aria-sort'));
    // numbers open on the biggest figure, names open at A; after that it toggles
    const dir = was ? (was === 'descending' ? 1 : -1) : (th.dataset.sort === 'name' ? 1 : -1);
    th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
    render(th.dataset.sort, dir);
  }));
}
function sortState(tableSel, fallback) {
  const th = $(`${tableSel} thead th[aria-sort]`);
  return [th?.dataset.sort || fallback,
    th?.getAttribute('aria-sort') === 'ascending' ? 1 : -1];
}
/* Nulls always sink, whichever way the column points, so a place with no
   reading for the chosen item never sits above one that has a price. */
function compare(x, y, dir) {
  if (x === null || x === undefined || y === null || y === undefined) {
    return (x ?? null) === null ? ((y ?? null) === null ? 0 : 1) : -1;
  }
  return (x - y) * dir;
}

function wireMore(tableSel, btnSel) {
  const table = $(tableSel), btn = $(btnSel);
  btn.addEventListener('click', () => {
    const on = table.classList.toggle('all');
    btn.classList.toggle('open', on);
    btn.textContent = on ? t('less_rows') : t('more_rows', { n: num(+btn.dataset.hidden || 0) });
  });
}

/* The state table reads whatever the map is colored by. On the basket that is
   the figure the study is built on; on a single item the per-state median, its
   cheapest and priciest shop and its shop count all come from that item's own
   file, and the ranking is recomputed for it — a state can sit 3rd on the
   basket and 31st on the Crunchy Taco. */
function stateRows() {
  const it = state.metric === 'basket' ? null : state.data.items.find(i => i.code === state.metric);
  const d = it ? state.itemCache.get(it.code) : null;
  if (!it || !d) {
    return state.data.states.map(s => ({
      code: s.code, name: s.name, rank: s.rank, value: s.basket,
      vs: s.vs_national, min: s.min, max: s.max, stores: s.stores,
    }));
  }
  const rows = state.data.states.map(s => {
    const v = d.by_state[s.code] ?? null;
    return {
      code: s.code, name: s.name, rank: null, value: v,
      vs: v === null ? null : Math.round((v - it.median) * 100) / 100,
      // an item file built before the per-state extremes existed still renders
      min: (d.state_min || {})[s.code] ?? null, max: (d.state_max || {})[s.code] ?? null,
      stores: (d.state_counts || {})[s.code] ?? 0,
    };
  });
  rows.slice().sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
    .forEach((r, i) => { r.rank = r.value === null ? null : i + 1; });
  return rows;
}

function renderStates(sortKey, dir) {
  if (sortKey === undefined) [sortKey, dir] = sortState('#state-table', 'basket');
  const tb = $('#state-table tbody');
  const home = state.me ? state.me.state : 'MI';
  const pick = {
    rank: r => r.rank, basket: r => r.value, vs: r => r.vs,
    min: r => r.min, max: r => r.max, stores: r => r.stores,
  };
  const rows = stateRows().sort((a, b) => sortKey === 'name'
    ? a.name.localeCompare(b.name) * dir
    : compare(pick[sortKey](a), pick[sortKey](b), dir));
  tb.innerHTML = rows.map(s => `
    <tr class="clickable${s.code === home ? ' you' : ''}" data-code="${s.code}" tabindex="0"${
      s.value === null ? ` title="${t('panel_not_sold')}"` : ''}>
      <td class="rank">${s.rank ?? '—'}</td>
      <td><span class="place"><span class="dot"${s.value === null ? ' hidden' : `
        style="background:${shade(state.scale.t(s.value))}"`}></span>
        <span class="nm">${esc(s.name)}</span>${s.code === home ? `<span class="you-chip">${t('you_chip')}</span>` : ''}</span></td>
      <td class="num"><strong>${money(s.value)}</strong></td>
      <td class="num">${s.vs === null ? '—'
        : `<span class="delta ${s.vs > 0 ? 'up' : 'down'}">${signed(s.vs)}</span>`}</td>
      <td class="num hide-sm sm">${money(s.min)}</td>
      <td class="num hide-sm sm">${money(s.max)}</td>
      <td class="num hide-sm sm">${s.stores || '—'}</td>
    </tr>`).join('');
  capRows('#state-table', '#state-more');
}

/* The like-for-like table: the very cities the headline ranks against, so the
   two can never disagree. Long bands are capped, and the note says by how much. */
const PEER_ROW_CAP = 250;
function renderPeers(sortKey, dir) {
  const a = state.city;
  if (!a || !state.cities.length) return;
  if (sortKey === undefined) [sortKey, dir] = sortState('#peer-table', 'basket');
  const me = a.me, mine = c => c.city === me.name && c.state === me.state;
  const item = state.metric !== 'basket';

  /* Rank runs on whatever is being priced, so picking one item really does
     reorder the cities rather than relabel the same order. */
  const ranked = a.peers.map(c => ({ ...c, val: cityValue(c) }))
    .sort((x, y) => compare(x.val, y.val, -1))
    .map((c, i) => ({ ...c, prank: c.val === null ? null : i + 1 }));
  const priced = ranked.filter(c => c.val !== null);
  const mid = priced.length ? median(priced.map(c => c.val)) : null;

  $('#peer-title').textContent = t('peers_title', { city: me.name });
  $('#peer-sub').textContent = item
    ? t('item_scope_cities', { item: metricLabel() })
    : t('peers_sub', { lo: num(a.lo), hi: num(a.hi) });
  $('#th-peer-basket').textContent = item ? metricLabel() : t('th_basket');
  $('#peers-chip').textContent = t('peers_chip', { n: num(a.peers.length) });
  $('#peer-near-opt').textContent = t('peers_opt_near', { city: me.name });
  $('#peer-home-opt').textContent = t('peers_opt_home', { state: stateName(me.state) });

  const q = $('#peer-filter').value;
  const at = ranked.findIndex(mine);
  let rows = ranked, note = '';
  if (q === 'home') rows = ranked.filter(c => c.state === me.state);
  else if (q === 'near' && at >= 0) rows = ranked.slice(Math.max(0, at - 7), at + 8);
  else if (rows.length > PEER_ROW_CAP) {
    rows = ranked.slice(0, PEER_ROW_CAP);
    note = t('peer_note', { shown: num(PEER_ROW_CAP), total: num(ranked.length),
      city: t('peers_opt_near', { city: me.name }) });
  }

  /* The band above is picked on price order; this is the order it is shown in. */
  const pick = { rank: c => c.prank, pop: c => c.pop, basket: c => c.val,
    vs: c => (c.val === null || mid === null ? null : c.val - mid), stores: c => c.stores };
  rows = rows.slice().sort((x, y) => sortKey === 'name'
    ? `${x.city}, ${x.state}`.localeCompare(`${y.city}, ${y.state}`) * dir
    : compare((pick[sortKey] || pick.basket)(x), (pick[sortKey] || pick.basket)(y), dir));

  /* Only worth explaining the dashes when some are actually on screen. The
     'Near {city}' view is fifteen rows and usually has none. */
  if (item && rows.some(c => c.val === null)) {
    const why = t('no_item_note', { n: num(priced.length) });
    note = note ? `${note} ${why}` : why;
  }

  $('#peer-note').textContent = note;
  $('#peer-note').hidden = !note;
  $('#peer-table tbody').innerHTML = rows.map(c => `
    <tr class="clickable${mine(c) ? ' you' : ''}" data-code="${c.state}" tabindex="0"${
      c.val === null ? ` title="${t('no_item_city')}"` : ''}>
      <td class="rank">${c.prank ?? '—'}</td>
      <td><span class="place"><span class="dot"${c.val === null ? ' hidden' : `
        style="background:${shade(state.scale.t(c.val))}"`}></span>
        <span class="nm">${esc(c.city)}${desigTag(c)}, ${esc(c.state)}</span>${
          mine(c) ? `<span class="you-chip">${t('you_chip_city')}</span>` : ''}</span></td>
      <td class="num hide-sm sm">${num(c.pop)}</td>
      <td class="num"><strong>${money(c.val)}</strong></td>
      <td class="num hide-sm">${c.val === null || mid === null ? '—'
        : `<span class="delta ${c.val > mid ? 'up' : 'down'}">${signed(c.val - mid)}</span>`}</td>
      <td class="num hide-sm sm">${c.stores}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="empty">${t('panel_empty')}</td></tr>`;
  capRows('#peer-table', '#peer-more');
}

function renderItems(sortKey, dir) {
  if (sortKey === undefined) [sortKey, dir] = sortState('#item-table', 'median');
  const rows = state.data.items.filter(i => i.coverage >= 0.5);
  const pick = { median: i => i.median, spread: i => i.spread, max: i => i.max, min: i => i.min };
  const cmp = (a, b) => sortKey === 'name'
    ? (a.name || '').localeCompare(b.name || '') * dir
    : compare((pick[sortKey] || pick.median)(a), (pick[sortKey] || pick.median)(b), dir);
  $('#item-table tbody').innerHTML = rows.sort(cmp).slice(0, 60).map(i => `
    <tr${i.detail ? ` class="clickable" data-item="${i.code}" tabindex="0"` : ''}>
      <td><span class="nm">${esc(i.name)}</span><div class="sm">${esc(i.category)}${
        i.coverage < 0.95 ? ` · ${t('item_partial', { pct: Math.round(i.coverage * 100) })}` : ''}${
        i.detail ? ` · ${t('item_tap')}` : ''}</div></td>
      <td class="num"><strong>${money(i.median)}</strong></td>
      <td class="num hide-sm sm">${money(i.min)}<div class="sm">${esc(i.cheapest_at.city)}, ${esc(i.cheapest_at.state)}</div></td>
      <td class="num hide-sm sm">${money(i.max)}<div class="sm">${esc(i.priciest_at.city)}, ${esc(i.priciest_at.state)}</div></td>
      <td class="num"><span class="delta up">${money(i.spread)}</span></td>
    </tr>`).join('');
  capRows('#item-table', '#item-more');
}

/* Pinch, drag and wheel over the map. #map sets touch-action:none, which is a
   further restriction on the page's own pan-y/pinch-zoom rule rather than a
   re-enabling of it, so the page still cannot be dragged sideways. */
function wireMapZoom() {
  const svg = $('#map');
  const pts = new Map();
  let pinchD = 0, pan = null, moved = 0;

  const worldAt = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    return { x: view.x + (cx - r.left) / r.width * view.w,
             y: view.y + (cy - r.top) / r.height * view.h };
  };

  /* Zoom about a fixed point: whatever is under the cursor or the pinch
     midpoint has to stay under it, or the map swims away from the finger. */
  function zoomAt(cx, cy, factor) {
    const p = worldAt(cx, cy), was = view.w;
    view.w = Math.min(MAP_W, Math.max(MAP_W / MAX_K, view.w / factor));
    view.h = view.w * (MAP_H / MAP_W);
    const s = view.w / was;
    view.x = p.x - (p.x - view.x) * s;
    view.y = p.y - (p.y - view.y) * s;
    clampView(); applyView();
  }

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    hideTip();
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016));
  }, { passive: false });

  svg.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, e);
    // Capture on the pressed shape so a tap still clicks that state or dot.
    // Capturing on the parent SVG retargeted clicks away from the shape.
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 1) { pan = { x: e.clientX, y: e.clientY }; moved = 0; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinchD = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pan = null;
    }
  });

  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, e);
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinchD > 0 && d > 0) zoomAt((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, d / pinchD);
      pinchD = d;
      moved = 999;
      hideTip();
      return;
    }
    if (!pan) return;
    const r = svg.getBoundingClientRect();
    moved += Math.abs(e.clientX - pan.x) + Math.abs(e.clientY - pan.y);
    view.x -= (e.clientX - pan.x) / r.width * view.w;
    view.y -= (e.clientY - pan.y) / r.height * view.h;
    pan = { x: e.clientX, y: e.clientY };
    if (moved > 4) { svg.classList.add('dragging'); hideTip(); }
    clampView(); applyView();
  });

  const end = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinchD = 0;
    if (pts.size === 0) { pan = null; svg.classList.remove('dragging'); }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  /* A drag that happens to finish over Nevada must not also open Nevada.
     Capture runs before the click handler further down this file. */
  svg.addEventListener('click', e => {
    if (moved > 4) { e.stopPropagation(); e.preventDefault(); }
    moved = 0;
  }, true);

  $('#map-in').addEventListener('click', () => {
    const r = svg.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.6);
  });
  $('#map-out').addEventListener('click', () => {
    const r = svg.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.6);
  });
  $('#map-reset').addEventListener('click', resetView);
}

/* ---------- state drill-down ---------- */
let panelMenuFor = null;
let panelOpener = null;
function openState(code) {
  const rec = state.data.states.find(s => s.code === code);
  if (!rec) return;
  if (!state.stores.length) { state.pendingState = code; loadCore(); return; }
  if (!state.open) panelOpener = document.activeElement;
  state.open = code;
  state.panelQuery = '';
  const nat = state.data.meta.national_basket_median;
  const byCode = Object.fromEntries(state.data.items.map(i => [i.code, i]));

  /* The panel opens on whatever the map is colored by. Choose a single item in
     the metric picker and a state's card, its ranking and every shop row switch
     to that item's price; the basket stays the default. */
  const item = state.metric === 'basket' ? null : byCode[state.metric] || null;
  const slot = item ? state.data.featured.indexOf(item.code) : -1;
  const spread = item ? (state.itemCache.get(item.code) || null) : null;
  const here = spread ? (spread.by_state[code] ?? null) : null;

  const shops = state.stores.filter(s => s.state === code)
    .sort((a, b) => (b.basket ?? -1) - (a.basket ?? -1));

  let rank = rec.rank, total = state.data.states.length;
  if (item && spread) {
    const read = Object.values(spread.by_state).filter(v => v !== null && v !== undefined);
    rank = here === null ? null : read.filter(v => v > here).length + 1;
    total = read.length;
  }

  $('#p-title').textContent = rec.name;
  $('#p-sub').textContent = (item ? item.name + ' · ' : '')
    + (rank === null ? t('tip_no_data')
       : t('panel_sub', { rank: num(rank), total: num(total), n: num(shops.length) }));

  const stat = (k, v, tint) => `<div><div class="k">${esc(k)}</div><div class="v"${
    tint === undefined ? '' : ` style="color:${tint > 0 ? 'var(--dear)' : 'var(--cheap)'}"`}>${v}</div></div>`;
  const headFor = (lo, hi) => item
    ? `<div class="pstat">
        ${stat(item.name, money(here))}
        ${stat(t('panel_stat_vs'), here === null ? '—' : signed(here - item.median),
          here === null || Math.abs(here - item.median) < 0.005 ? undefined : here - item.median)}
        ${stat(t('panel_stat_min'), money(lo))}
        ${stat(t('panel_stat_max'), money(hi))}
      </div>
      <p class="pnote">${t('panel_note_basket', { amount: money(rec.basket),
        rank: num(rec.rank), total: num(state.data.states.length) })}</p>`
    : `<div class="pstat">
        ${stat(t('panel_stat_basket'), money(rec.basket))}
        ${stat(t('panel_stat_vs'), signed(rec.vs_national), rec.vs_national)}
        ${stat(t('panel_stat_min'), money(rec.min))}
        ${stat(t('panel_stat_max'), money(rec.max))}
      </div>`;
  const head = headFor(item ? null : rec.min, item ? null : rec.max);
  $('#p-body').innerHTML = head + `<p class="empty">${t('panel_loading')}</p>`;

  $('#scrim').hidden = false;
  $('#panel').hidden = false;
  document.body.classList.add('locked');
  $('#panel').focus();
  $$('#map path.st').forEach(p => p.classList.toggle('on', p.dataset.code === code));
  history.replaceState(null, '', '#' + code);

  loadStateMenus(code).then(menus => {
    if (state.open !== code) return;
    /* California has three hundred restaurants. Writing forty price lines for
       every one of them up front is twelve thousand nodes nobody has asked to
       see, so each menu is filled the first time its row is opened. */
    const menuFor = id => state.data.featured.map((ic, i) => {
      const p = (menus[id] || [])[i];
      if (p === null || p === undefined) return '';
      const it = byCode[ic];
      const d = it ? p - it.median : 0;
      return `<div${item && ic === item.code ? ' class="hit"' : ''}><span class="nm">${esc(it ? it.name : ic)}</span>
        <span class="pr">${money(p)}${Math.abs(d) >= 0.01
          ? `<em class="delta ${d > 0 ? 'up' : 'down'}">${signed(d)}</em>` : ''}</span></div>`;
    }).join('') || `<div class="empty">${t('panel_empty')}</div>`;

    const priceOf = id => slot < 0 ? null : ((menus[id] || [])[slot] ?? null);
    let top = head, list = shops;
    if (item) {
      const seen = shops.map(s => priceOf(s.id)).filter(v => v !== null);
      top = headFor(seen.length ? Math.min(...seen) : null, seen.length ? Math.max(...seen) : null);
      list = [...shops].sort((a, b) => (priceOf(b.id) ?? -1) - (priceOf(a.id) ?? -1));
    }

    const amtFor = s => {
      const v = item ? priceOf(s.id) : s.basket;
      const ref = item ? item.median : nat;
      const miss = t(item ? 'panel_not_sold' : 'panel_incomplete');
      return `${money(v)}<small>${v === null ? miss : signed(v - ref) + ' ' + t('panel_vs_us')}</small>`;
    };

    const rowFor = s => `
      <details class="shop" data-id="${esc(s.id)}">
        <summary>
          <span class="who"><b>${esc(s.street || 'Taco Bell')}</b>
            <span>${esc(s.city)}, ${esc(s.state)} ${esc(s.zip || '')} · #${esc(s.id)}</span></span>
          <span class="amt">${amtFor(s)}</span>
        </summary>
        <div class="menu"></div>
      </details>`;

    /* Sorting on the figure the panel is currently showing, so switching the
       metric picker to a single item re-sorts on that item's price rather than
       leaving the rows in basket order. A restaurant missing the figure sinks to
       the bottom either way instead of pretending to be the cheapest. */
    const valOf = s => item ? priceOf(s.id) : s.basket;
    const SORTS = {
      high: (a, b) => (valOf(b) ?? -Infinity) - (valOf(a) ?? -Infinity),
      low:  (a, b) => (valOf(a) ??  Infinity) - (valOf(b) ??  Infinity),
      az:   (a, b) => (a.city || '').localeCompare(b.city || '')
                   || (a.street || '').localeCompare(b.street || ''),
    };

    const body = $('#p-body');
    body.innerHTML = top + `
      <div class="panel-tools">
        <label class="picker"><span>${t('panel_sort_label')}</span>
          <select id="p-sort">
            <option value="high">${t('panel_sort_high')}</option>
            <option value="low">${t('panel_sort_low')}</option>
            <option value="az">${t('panel_sort_az')}</option>
          </select>
        </label>
        <input id="p-search" type="search" autocomplete="off" spellcheck="false"
          aria-label="${t('panel_search_ph')}" placeholder="${t('panel_search_ph')}">
        <span class="panel-shown" id="p-shown"></span>
      </div>
      <div id="p-list"></div>`;

    const paint = () => {
      const q = state.panelQuery.trim().toLowerCase();
      const hit = s => !q || [s.street, s.city, s.zip, s.id]
        .some(f => String(f ?? '').toLowerCase().includes(q));
      const rows = list.filter(hit).sort(SORTS[state.panelSort] || SORTS.high);
      $('#p-list').innerHTML = rows.map(rowFor).join('') || `<p class="empty">${
        q ? t('panel_no_match', { q: esc(state.panelQuery.trim()) }) : t('panel_empty')}</p>`;
      $('#p-shown').textContent = rows.length === list.length ? ''
        : t('panel_shown', { shown: num(rows.length), total: num(list.length) });
    };

    $('#p-sort').value = state.panelSort;
    $('#p-search').value = state.panelQuery;
    $('#p-sort').addEventListener('change', e => { state.panelSort = e.target.value; paint(); });
    $('#p-search').addEventListener('input', e => { state.panelQuery = e.target.value; paint(); });
    paint();

    /* #p-body outlives every panel, so this listener is attached once and reads
       the current state's menu builder. Attaching it per open stacked a new
       listener on the same element each time a state was clicked. */
    panelMenuFor = menuFor;
    if (!body.dataset.wired) {
      body.dataset.wired = '1';
      body.addEventListener('toggle', e => {
        const d = e.target;
        if (!d.open || d.dataset.filled || !panelMenuFor) return;
        d.dataset.filled = '1';
        $('.menu', d).innerHTML = panelMenuFor(d.dataset.id);
      }, true);
    }
  }).catch(() => {
    if (state.open === code) $('#p-body').innerHTML = head + `<p class="empty">${t('panel_error')}</p>`;
  });
}

function closeState() {
  state.open = null;
  $('#scrim').hidden = true;
  $('#panel').hidden = true;
  document.body.classList.remove('locked');
  $$('#map path.st').forEach(p => p.classList.remove('on'));
  history.replaceState(null, '', location.pathname + location.search);
  if (panelOpener?.isConnected) panelOpener.focus({preventScroll:true});
}

/* ---------- the answer ---------- */
/* One set of words serves every city. The city the study was written around is
   simply the one the page opens on; its figures are worked out from the same
   week's data as anyone else's. The old five-sentence paragraph is now a badge,
   one line, and three small widgets that each carry a single idea. */

const stateName = code => (state.data.states.find(s => s.code === code) || {}).name || code;

function paintHero(v) {
  state.hero = v;
  $('#hero-place').textContent = v.place;
  $('#v-badge').textContent = v.badge;
  $('#v-badge').className = 'badge ' + v.tone;
  $('#v-line').innerHTML = v.line;
  $('#v-lead-label').textContent = v.item
    ? t('answer_label_item', { item: metricLabel(), city: v.town })
    : t('answer_label_here', { city: v.town });
  $('#which-items').hidden = !!v.item;
  $('#v-here').textContent = money(v.basket);
  $('#v-here').style.color = v.peer === null ? 'var(--ink)'
    : v.dearer ? 'var(--dear)' : 'var(--cheap)';
  $('#v-peer').innerHTML = `<small>${esc(t('answer_label_peers'))}</small> ${money(v.peer)}`;
  $('#v-peer-label').textContent = t('answer_label_peers');
  $('#v-peer-sub').textContent = v.peerSub;
  $('#v-sampled').textContent = v.sampledLine;
  paintPeerBand(v);
  paintVerdictBars(v);
  $('#v-note').textContent = v.note;
  $('#v-note').hidden = !v.note;
  $('#hero-reset-text').textContent = t('hero_reset', { city: v.homeName });
  $('#hero-reset-wrap').hidden = v.isHome;
  $('#verdict').hidden = false;
  renderDrive(v);
  renderRank(v);
  renderBand(v);
}

/* Rounded the way someone would say it out loud: 18,552 people becomes 19k,
   1,240,000 becomes 1.2M. The exact figure was noise on this line. */
function peopleShort(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function paintPeerBand(v) {
  const el = $('#v-band');
  const b = v.peerBand;
  if (!b || !(b.hi > b.lo)) { el.hidden = true; return; }
  el.hidden = false;
  const at = Math.max(0, Math.min(1, (b.pop - b.lo) / (b.hi - b.lo)));
  $('#v-band-lo').textContent = peopleShort(Math.round(b.lo));
  $('#v-band-hi').textContent = peopleShort(Math.round(b.hi));
  const dot = $('#v-band-dot');
  dot.style.left = `${(at * 100).toFixed(1)}%`;
  dot.title = `${num(b.pop)} people`;
}

/* One bar, read left to right: what a typical city its size pays, the stretch
   this city adds on top (or keeps, when it is cheaper), and the total. The bar
   is scaled so the larger of the two totals fills it. */
function paintVerdictBars(v) {
  const base = $('#v-bar-base'), extra = $('#v-bar-extra');
  const tone = v.peer === null ? 'var(--ink-2)' : v.dearer ? 'var(--dear)' : 'var(--cheap)';
  const muted = 'color-mix(in srgb, var(--ink-3) 42%, transparent)';

  if (v.peer === null) {
    base.style.width = '100%';
    base.style.background = tone;
    extra.hidden = true;
    $('#v-bracket').hidden = true;
    return;
  }

  const max = Math.max(v.basket, v.peer) || 1;
  const pc = n => `${(n / max * 100).toFixed(2)}%`;
  const gap = v.basket - v.peer;

  // the plain stretch is always what a typical city pays, so the label under it
  // is true either way; the marked chunk is what this city adds or keeps
  $('#v-bracket').hidden = false;
  base.style.width = pc(v.peer);
  base.style.background = muted;

  if (Math.abs(gap) < 0.005) {
    base.style.background = tone;
    extra.hidden = true;
    return;
  }

  extra.hidden = false;
  extra.className = `vover ${gap > 0 ? 'up' : 'down'}`;
  extra.style.width = pc(Math.abs(gap));

  $('#v-gap-amt').textContent = `${gap > 0 ? '+' : '−'}${money(Math.abs(gap))}`;
}

/* The nearest restaurant charging less than this city does, measured from the
   city itself. It used to be measured from the city's nearest sampled
   restaurant, which for a place like Ketchikan — whose nearest sampled
   restaurant is 589 miles away in Washington — offered a 67-mile drive that was
   really 600. Past 200 miles it stops being a drive anyone would make for
   twelve tacos, so it is simply not offered. */
const DRIVE_CAP_MI = 200;
function cityDrive(a) {
  let best = null, bestMi = Infinity;
  let there = null;
  for (const { s, v, mi } of a.shops) {    // a.shops already carries miles from the city
    if (v >= a.basket) continue;
    if (mi > 0.1 && mi < bestMi) { bestMi = mi; best = s; there = v; }
  }
  if (!best || bestMi > DRIVE_CAP_MI) return null;
  const saving = Math.round((a.basket - there) * 100) / 100;
  const share = saving / a.basket * 100;
  return { to: best, there, miles: bestMi < 10 ? Math.round(bestMi * 10) / 10 : Math.round(bestMi),
           saving, pct: share < 1 ? share.toFixed(1) : Math.round(share) };
}

function cityHero(a) {
  const d = state.data, me = a.me, town = esc(me.name);
  const home = d.reference;
  const isHome = me.name === home.city && me.state === home.state;
  const gap = a.med === null ? null : a.basket - a.med;
  const dearer = gap !== null && gap > 0;
  const band = a.item ? itemBand(a) : d.tiers.points.find(p => p.basket === a.basket) || null;

  let badge, line, tone;
  if (gap === null) {
    badge = '?'; tone = 'flat';
    line = t('verdict_nodata', { n: num(a.use.length) });
  } else if (Math.abs(gap) < (a.item ? 0.05 : 0.25)) {
    badge = t('verdict_badge_tie'); tone = 'flat';
    line = t('verdict_tie', { amount: signed(gap) });
  } else {
    badge = t(dearer ? 'verdict_badge_yes' : 'verdict_badge_no');
    tone = dearer ? 'up' : 'down';
    line = t(dearer ? 'verdict_yes' : 'verdict_no', {
      amount: money(Math.abs(gap)),
      pct: Math.abs(gap / a.med * 100).toFixed(0),
    });
  }

  return {
    isHome, town: me.name, homeName: home.city, item: a.item,
    place: `${me.name}, ${stateName(me.state)}`,
    badge, line, tone,
    basket: a.basket, dearer, peer: a.med,
    sampledLine: a.exact
      ? t('answer_sampled_here', { n: num(a.shopCount), city: me.name })
      : t('answer_sampled_near', { n: num(a.use.length) }),
    peerSub: a.med === null ? t('answer_sub_peers_none')
      : t(a.item ? 'answer_sub_peers_item' : 'answer_sub_peers', { n: num(a.ranked) }),
    /* the population band the peers were drawn from, with this city's own
       population marked inside it, so "cities this size" is something seen
       rather than a pair of numbers to be read */
    peerBand: a.med === null ? null : { lo: a.lo, hi: a.hi, pop: me.pop },
    note: a.sampled ? '' : t('nearby_far_note', { n: num(a.use.length), miles: num(a.far) }),
    drive: cityDrive(a),
    rank: a.rank === null ? null : {
      rank: a.rank, total: a.ranked, pct: a.pct,
      stateRank: a.kinRank, stateTotal: a.kin.length, state: stateName(me.state),
    },
    band,
  };
}

/* On a single item there is no stored list of shared prices, so it is counted
   here: every sampled restaurant charging exactly this city's price. */
function itemBand(a) {
  const hits = a.shops.filter(n => Math.abs(n.v - a.basket) < 0.005);
  if (!hits.length) return null;
  return { stores: hits.length, states: [...new Set(hits.map(n => n.s.state))].sort() };
}

/* Apple Maps on Apple hardware, Google Maps everywhere else. Both take a
   plain address, so nothing here depends on the restaurant's coordinates
   being right. The link opens in a new tab; the page never navigates away. */
function mapsUrl(s) {
  const q = encodeURIComponent(
    [s.street, s.city, s.state, s.zip].filter(Boolean).join(', '));
  const apple = /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent || '');
  return apple ? `https://maps.apple.com/?daddr=${q}`
               : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

/* ---------- the widget that says where to go instead ---------- */
/* The practical end of the old paragraph, given its own card: the closest
   restaurant charging less, how far it is, and what the same order saves. */
function renderDrive(v) {
  const el = $('#sub-drive');
  const dr = v.drive;
  el.hidden = false;
  if (!dr) {
    el.className = 'sub sub-drive none';
    el.removeAttribute('data-code');
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
    el.innerHTML = `
      <h3 class="sub-h">${t('drive_none_title')}</h3>
      <p class="drive-none">${t('drive_none_body', { city: esc(v.town) })}</p>`;
    return;
  }
  const there = dr.there, max = Math.max(v.basket, there) || 1;
  const pc = n => `${(n / max * 100).toFixed(1)}%`;
  el.className = 'sub sub-drive';
  el.dataset.code = dr.to.state;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.innerHTML = `
    <h3 class="sub-h">${t('drive_title')}</h3>
    <div class="drive-top">
      <span class="drive-save">${money(dr.saving)}</span>
      <p class="drive-lead">${t(v.item ? 'drive_lead_item' : 'drive_lead', { item: esc(metricLabel()),
        town: `<strong>${esc(dr.to.city)}</strong>`, miles: dr.miles,
        saving: money(dr.saving), pct: dr.pct })}</p>
    </div>
    <div class="drive-cmp">
      <div class="dline here">
        <span class="dlab">${t('drive_here_label', { city: esc(v.town) })}</span>
        <span class="dtrack"><i style="width:${pc(v.basket)}"></i></span>
        <span class="damt">${money(v.basket)}</span>
      </div>
      <div class="dline there">
        <span class="dlab">${t('drive_there_label', { town: esc(dr.to.city) })}</span>
        <span class="dtrack"><i style="width:${pc(there)}"></i></span>
        <span class="damt">${money(there)}</span>
      </div>
    </div>
    <div class="drive-meta">
      <span class="drive-pill">
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>
        ${dr.miles} mi</span>
      <a class="drive-pill addr" target="_blank" rel="noopener noreferrer"
        href="${esc(mapsUrl(dr.to))}" title="${esc(t('drive_directions'))}">${esc(dr.to.street || 'Taco Bell')}, ${esc(dr.to.city)}, ${esc(dr.to.state)}
        <span class="go-ico" aria-label="${esc(t('drive_directions'))}"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M9 7h8v8"/></svg></span></a>
    </div>
    <p class="drive-foot">${t(v.item ? 'drive_foot_item' : 'drive_foot')}</p>`;
}

/* ---------- the ranking ---------- */
/* Where this city falls among cities its size, as a marker on a track that runs
   from the cheapest of them to the priciest. The marker slides into place the
   first time the card comes on screen, so the motion says "you are here". */
const GAUGE_CALM = () => document.documentElement.dataset.motion === 'paused' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* Jumping to a section. Safari has no scroll anchoring, so a section jumped to
   while the city data, map and cards are still drawing above it gets pushed
   down the page and the jump lands well short. This keeps the section pinned
   under the header until the page stops moving, for at most four seconds, and
   lets go the moment the reader touches, scrolls or types. */
let pinning = null;
function pinTo(el) {
  if (pinning) pinning.abort();
  const ctl = pinning = new AbortController();
  const pad = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const docTop = () => Math.round(el.getBoundingClientRect().top + scrollY);
  const place = () => scrollTo({ top: docTop() - pad(), behavior: GAUGE_CALM() ? 'instant' : 'smooth' });
  ['touchstart', 'wheel', 'keydown'].forEach(ev =>
    addEventListener(ev, () => ctl.abort(), { passive: true, signal: ctl.signal }));
  place();
  const t0 = performance.now();
  let last = docTop();
  const tick = () => {
    if (ctl.signal.aborted) return;
    if (performance.now() - t0 > 4000) { ctl.abort(); return; }
    const now = docTop();
    if (now !== last) { last = now; place(); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented) return;
  const el = a.getAttribute('href').length > 1 && document.getElementById(a.getAttribute('href').slice(1));
  if (!el) return;
  e.preventDefault();
  history.pushState(null, '', a.getAttribute('href'));
  pinTo(el);
});

const ordinal = n => {
  const k = n % 100, e = n % 10;
  return num(n) + (k >= 11 && k <= 13 ? 'th' : e === 1 ? 'st' : e === 2 ? 'nd' : e === 3 ? 'rd' : 'th');
};

let rankSeen = null;
function renderRank(v) {
  const el = $('#sub-rank');
  if (!v.rank) { el.hidden = true; return; }
  const r = v.rank, f = Math.max(0, Math.min(1, r.pct / 100));
  el.hidden = false;
  el.innerHTML = `
    <h3 class="sub-h">${t('rank_label')}</h3>
    <p class="rk-big">${t('rank_value', { rank: ordinal(r.rank) })}</p>
    <p class="rk-of">${t('rank_of', { total: num(r.total), city: esc(v.town) })}</p>
    <div class="rk-track" style="--at:${(f * 100).toFixed(1)}%;--rk-color:${shade(f)}" aria-hidden="true">
      <i class="rk-fill"></i><b class="rk-pin"></b>
    </div>
    <div class="rk-ends" aria-hidden="true"><span>${esc(t('gauge_low'))}</span><span>${esc(t('gauge_high'))}</span></div>
    <p class="rk-sub">${t('rank_sub', { pct: r.pct })}</p>
    ${r.stateRank ? `<p class="rk-sub2">${r.stateRank === 1
      ? t('rank_state_top', { total: num(r.stateTotal), state: esc(r.state) })
      : t('rank_state_sub', { rank: ordinal(r.stateRank), total: num(r.stateTotal), state: esc(r.state) })}</p>` : ''}`;
  const go = () => requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('rk-in')));
  if (GAUGE_CALM() || rankSeen) { el.classList.add('rk-in'); return; }
  el.classList.remove('rk-in');
  new IntersectionObserver((hits, io) => {
    if (hits.some(h => h.isIntersecting)) { rankSeen = true; io.disconnect(); go(); }
  }, { threshold: .4 }).observe(el);
}

/* ---------- the shared-price-list widget ---------- */
/* One square per restaurant charging this exact total, with this city's own
   square marked, so "not a local decision" is something you see. */
const BAND_DOT_CAP = 72, BAND_STATE_CAP = 12;
function renderBand(v) {
  const el = $('#sub-band');
  el.hidden = false;
  const b = v.band;
  if (!b || b.stores <= 1) {
    el.innerHTML = `
      <h3 class="sub-h">${t('band_label')}</h3>
      <p class="band-sub">${t(v.item ? 'band_none_item' : 'band_none', { city: esc(v.town) })}</p>`;
    return;
  }
  const dots = Math.min(b.stores, BAND_DOT_CAP);
  el.innerHTML = `
    <h3 class="sub-h">${t('band_label')}</h3>
    <span class="band-val">${t('band_value', { stores: num(b.stores), states: num(b.states.length) })}</span>
    <div class="bandviz" aria-hidden="true">${
      Array.from({ length: dots }, (_, i) => `<i class="${i === 0 ? 'me' : ''}"></i>`).join('')}</div>
    <p class="band-sub">${t(v.item ? 'band_sub_item' : 'band_sub', { city: esc(v.town) })}</p>
    <div class="band-states">${b.states.slice(0, BAND_STATE_CAP).map(s => `<span>${esc(s)}</span>`).join('')}${
      b.states.length > BAND_STATE_CAP ? `<span>${t('band_more', { n: b.states.length - BAND_STATE_CAP })}</span>` : ''}</div>`;
}

/* ---------- headline numbers ---------- */
function renderTiles() {
  const h = state.data.highlights, d = state.data;
  /* Tiles marked 'rep' repeat a figure another card already shows (the
     chart's range and median, the drive card) or one the price-book section
     covers, so phones leave them out. */
  const tl = [
    ['dear', t('tile_priciest_state'), money(h.priciest_state.basket),
      t('tile_priciest_state_cap', { state: h.priciest_state.name,
        vs: money(Math.abs(h.priciest_state.vs_national)) })],
    ['cheap', t('tile_cheapest_state'), money(h.cheapest_state.basket),
      t('tile_cheapest_state_cap', { state: h.cheapest_state.name,
        amount: money(h.national_spread), other: h.priciest_state.name })],
    ['pop', t('tile_priciest_item'), money(h.priciest_item.max),
      t('tile_priciest_item_cap', { item: h.priciest_item.name,
        city: h.priciest_item.priciest_at.city, state: h.priciest_item.priciest_at.state })],
    ['pop', t('tile_widest_item'), money(h.widest_item.spread),
      t('tile_widest_item_cap', { item: h.widest_item.name,
        min: money(h.widest_item.min), minstate: h.widest_item.cheapest_at.state,
        max: money(h.widest_item.max), maxstate: h.widest_item.priciest_at.state })],
    ['dear rep', t('tile_priciest_store'), money(h.dearest_store.basket),
      t('tile_priciest_store_cap', { street: h.dearest_store.street,
        city: h.dearest_store.city, state: h.dearest_store.state })],
    ['cheap rep', t('tile_cheapest_store'), money(h.cheapest_store.basket),
      t('tile_cheapest_store_cap', { street: h.cheapest_store.street,
        city: h.cheapest_store.city, state: h.cheapest_store.state })],
    ['pop', t('tile_widest_state'), money(h.widest_state.spread),
      t('tile_widest_state_cap', { state: h.widest_state.name,
        min: money(h.widest_state.min), max: money(h.widest_state.max) })],
    ['pop rep', t('tile_us_middle'), money(d.meta.national_basket_median),
      t('tile_us_middle_cap', { n: num(d.meta.stores_with_full_basket), states: num(d.states.length) })],
  ];
  const dr = state.city ? state.orderDrive : d.drive;
  if (dr) tl.splice(2, 0, ['cheap rep', t('tile_drive'), money(dr.saving),
    t('tile_drive_cap', { miles: dr.miles,
      from: state.city ? state.city.me.name : d.reference.city, to: dr.to.city })]);
  if (h.biggest_book) tl.push(['pop rep', t('tile_book'),
    t('tile_book_val', { n: num(h.biggest_book.stores) }),
    t('tile_book_cap', { states: h.biggest_book.states.join(', ') })]);
  const lg = d.items.find(i => i.code === 'drink:large');
  if (lg) tl.push(['pop', t('tile_drink'), money(lg.median),
    t('tile_drink_cap', { min: money(lg.min), minstate: lg.cheapest_at.state,
      max: money(lg.max), maxstate: lg.priciest_at.state })]);
  $('#tiles').innerHTML = tl.map(([cls, k, v, w]) =>
    `<div class="tile ${cls}"><span class="k">${esc(k)}</span><span class="v">${v}</span><span class="w">${esc(w)}</span></div>`).join('');
}

function renderTiers() {
  const d = state.data, pts = d.tiers.points, a = state.city;
  const most = Math.max(...pts.map(p => p.stores));
  $('#tiers').innerHTML = pts.map(p => {
    const here = a && !a.item && p.basket === a.basket;
    return `
    <div class="tier${here ? ' mine' : ''}">
      <span class="amt">${money(p.basket)}</span>
      <span class="bar"><i style="width:${(p.stores / most * 100).toFixed(1)}%;
        background:${shade(state.scale.t(p.basket))}"></i></span>
      <span class="cnt">${p.stores}<small>shops</small></span>
      <span class="who">${p.states.join(' · ')}${here ? ` — ${esc(a.me.name)}` : ''}</span>
    </div>`; }).join('');
  const share = d.tiers.top20_share * 100;
  $('#tier-facts').innerHTML = `
    <div class="facts">
      ${factTile(num(d.meta.stores_with_full_basket), t('bands_fact_stores'))}
      ${factTile(num(d.tiers.distinct), t('bands_fact_totals'))}
      ${factTile(num(d.tiers.top20_stores), t('bands_fact_top20'), `${Math.round(share)}%`, share)}
    </div>
    <p class="facts-line">${t('bands_punchline')}</p>`;
}

/* A section summed up as figures rather than a paragraph. Each tile is one
   number with a caption, optionally a faint second line and a meter where the
   number is a share of something. */
const factTile = (v, k, x, fill) => `
  <div class="fact">
    <span class="v">${esc(v)}</span>
    <span class="k">${esc(k)}</span>
    ${x ? `<span class="x">${esc(x)}</span>` : ''}
    ${fill === undefined ? '' : `<span class="meter">
      <span class="meter-track"><i style="width:${fill.toFixed(1)}%"></i></span>
    </span>`}
  </div>`;

/* The order itself, folded away under the answer it is the basis for.
   A receipt rather than a row of bubbles: every item on its own line with its
   typical price across the country and a bar for how big a slice of the order
   it is, and each line opens that item's full detail. */
function renderOrder() {
  const d = state.data, m = d.meta;
  const rows = m.basket_items.map(c => d.items.find(i => i.code === c)).filter(Boolean);
  const max = Math.max(...rows.map(i => i.median || 0)) || 1;
  $('#order-receipt').innerHTML = rows.map((i, n) => `
    <li class="rl${i.detail ? ' clickable' : ''}"${
      i.detail ? ` data-item="${esc(i.code)}" tabindex="0" role="button"` : ''}>
      <span class="rl-n">${n + 1}</span>
      <span class="rl-name">${esc(i.name)}</span>
      <span class="rl-bar" aria-hidden="true"><i style="width:${
        ((i.median || 0) / max * 100).toFixed(1)}%"></i></span>
      <span class="rl-amt">${money(i.median)}</span>
    </li>`).join('');
  /* The figure on the bottom line is the middle basket total across every
     restaurant, not the sum of the twelve medians above it, which would be a
     number no restaurant charges. The label says so. */
  $('#order-total').textContent = money(m.national_basket_median);
  $('#order-chip').textContent = t('items_chip', { n: num(rows.length) });
}

function renderMethod() {
  const m = state.data.meta;
  $('#method').innerHTML = [
    [num(m.stores_priced), t('method_stores')],
    [num(m.states_covered), t('method_states')],
    [num(m.cities_sampled), t('method_cities')],
    [num(m.distinct_items), t('method_items')],
    [num(m.price_rows), t('method_prices')],
    [num(state.data.book_count), t('method_books')],
    [num(m.basket_items.length), t('method_basket')],
  ].map(([k, w]) => `<div><div class="k">${k}</div><div class="w">${esc(w)}</div></div>`).join('');
  $('#method-chip').textContent = t('method_chip', { n: num(m.stores_priced) });
  const dn = $('#desig-note'); if (dn) dn.textContent = t('desig_note');
}

/* ---------- discovery dashboard: the same recorded data, new views ---------- */
/* One menu list; party packs are a tab on it rather than a card of their own. */
const discoverySort = { menu: 'coverage' };
const isPack = i => /\bpack\b/i.test(i.name) && !/cinnabon|drinks/i.test(i.name);
/* Picks the picture in assets/food/ for a menu item. Order matters: the more
   specific words come first, so "Chips and Nacho Cheese Sauce" is nachos and
   "Nacho Cheese Doritos Locos Tacos" is a taco. */
const FOOD_ART = [
  ['drink', /coffee|soda|lemonade|freeze|energy|refresca|drink/],
  ['dessert', /twist|churro|cinnabon|delights|cookie|empanada/],
  ['nachos', /^chips|nachos|nacho fries|fiesta potatoes|hash brown|fritos/],
  ['sauce', /sauce$|packet|salsa$|ranch$|sour cream|guacamole$|jalape|seasoning|^black beans|pintos/],
  ['party-pack', /\bpack\b/],
  ['combo', /combo|\bbox\b|meal for/],
  ['crunchwrap', /crunchwrap/],
  ['quesadilla', /quesadilla|flatbread/],
  ['pizza', /pizza/],
  ['nuggets', /nugget/],
  ['bowl', /\bbowl\b|salad/],
  ['chalupa', /chalupa|gordita/],
  ['burrito', /burrito|roll up|griller|stacker/],
  ['soft-taco', /soft taco/],
  ['crunchy-taco', /taco/],
];
function foodArt(item) {
  const name = item.name.toLowerCase();
  const hit = FOOD_ART.find(([, re]) => re.test(name));
  if (hit) return hit[0];
  return item.category === 'Drinks' ? 'drink' : 'combo';
}
function renderDiscoveryList() {
  const d = state.data, sort = discoverySort.menu;
  let rows = d.items.filter(i => i.detail && i.median !== null && i.median > 0);
  if (sort === 'packs') rows = rows.filter(isPack).sort((a,b) => b.coverage-a.coverage);
  else if (sort === 'coverage') rows = d.meta.basket_items.map(c => rows.find(i => i.code === c)).filter(Boolean);
  else rows = rows.filter(i => i.coverage >= .5 && !/sauce|packet|cream|jalapeño|seasoning/i.test(i.name));
  if (sort === 'median') rows.sort((a,b) => a.median-b.median || b.coverage-a.coverage);
  else if (sort === 'spread') rows.sort((a,b) => b.spread-a.spread);
  $('#menu-list').innerHTML = rows.slice(0,5).map(i => `
    <button class="menu-row" type="button" data-item="${esc(i.code)}" aria-label="${esc(i.name)}, ${money(i.median)} national median; explore prices">
      <span class="menu-thumb"><img src="assets/food/${foodArt(i)}.webp" alt="" width="49" height="41" loading="lazy"></span>
      <span class="menu-name">${esc(i.name)}</span><span class="menu-price">${money(i.median)}<small>${sort === 'spread' ? t('dash_item_gap',{gap:money(i.spread)}) : t('dash_national_median')}</small></span><span class="menu-arrow" aria-hidden="true">›</span>
    </button>`).join('') || `<p class="empty-list">${t('panel_empty')}</p>`;
}
/* Every sampled restaurant as one dot along the price line, scattered up and down
   only so they do not sit on top of each other; height carries no meaning. The
   drawing is sized to the box it lands in so the dots stay round. */
function stripSvg(vals, min, span, national) {
  const box = $('#national-comparison');
  const W = Math.max(240, Math.round(box.clientWidth || 560)), H = 100, pad = 5;
  const r = vals.length > 1500 ? 2.1 : 2.6;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dots = vals.map(v => {
    const x = pad + (v - min) / span * (W - 2 * pad);
    const y = pad + 6 + rnd() * (H - 2 * pad - 12);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${shade((v - national) / (span / 2) + .5)}"/>`;
  }).join('');
  return `<svg class="strip" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${dots}</svg>`;
}
let stripWidth = 0;
addEventListener('resize', () => {
  const w = $('#national-comparison')?.clientWidth || 0;
  if (state.city && Math.abs(w - stripWidth) > 40) { stripWidth = w; renderDashboard(); }
});

/* The support card prices a Crunchy Taco where the reader is, from the same
   restaurants that stand for the city in the headline. Their prices sit in the
   one or two state menu files those restaurants are in; when none of them sell
   it the card falls back to the national middle price rather than borrow one. */
const TIP_CODE = '22100';
let tipAsk = 0;
function renderTip() {
  const el = $('#tip-price'), a = state.city, d = state.data;
  const it = d.items.find(i => i.code === TIP_CODE), at = d.featured.indexOf(TIP_CODE);
  if (!el || !it) return;
  const show = html => { el.innerHTML = html; el.hidden = false; };
  const national = () => show(t('tip_price_us', { price: money(it.median) }));
  if (!a || at < 0) { national(); return; }
  const shops = a.use.map(n => n.s), ask = ++tipAsk;
  Promise.all([...new Set(shops.map(s => s.state))].map(loadStateMenus)).then(parts => {
    if (ask !== tipAsk) return;
    const price = midOf(shops.map(s => {
      const row = parts.map(p => p[s.id]).find(Boolean);
      return row ? row[at] : null;
    }).filter(v => v !== null && v !== undefined));
    if (price === null) national();
    else show(t('tip_price', { price: money(price), city: esc(a.me.name) }));
  }).catch(() => { if (ask === tipAsk) national(); });
}

function renderDashboard() {
  const d = state.data, a = state.city, m = d.meta;
  renderTip();
  $('#stat-locations').textContent = num(m.stores_priced);
  const baskets = state.stores.map(s => s.basket).filter(n => n !== null && n !== undefined).sort((a,b) => a-b);
  if (!a || !baskets.length) return;
  $('#stat-range').textContent = `${money(baskets[0])}–${money(baskets[baskets.length-1])}`;
  /* the 12-item range card above always shows the order; the chart follows the picker */
  const it = a.item ? d.items.find(i => i.code === state.metric) : null;
  const vals = a.item ? a.shops.map(n => n.v).sort((x, y) => x - y) : baskets;
  if (!vals.length) return;
  const min = vals[0], max = vals[vals.length-1];
  const national = it ? it.median : m.national_basket_median, gap = a.basket - national;
  const above = gap > .005, below = gap < -.005;
  const pct = vals.filter(v => v < a.basket).length / vals.length * 100;
  const span = max-min || 1;
  const at = Math.max(0,Math.min(100,(a.basket-min)/span*100));
  const medAt = Math.max(0,Math.min(100,(national-min)/span*100));
  $('#compare-tag').textContent = metricLabel();
  $('#compare-title').innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-pin"/></svg>${t('dash_compares',{city:esc(a.me.name)})}`;
  $('#national-comparison').innerHTML = `
    <p class="comparison-summary">${t('dash_percentile',{pct:Math.round(pct)})}</p>
    <p class="national-delta" style="color:var(--${above?'dear':'cheap'})">${money(Math.abs(gap))}</p>
    <p class="national-note">${t((above?'dash_above':below?'dash_below':'dash_equal')+(it?'_item':''))}</p>
    <div class="distribution" role="img" aria-label="${esc(t(it?'dash_hist_item':'dash_hist_accessible',{item:metricLabel(),min:money(min),max:money(max),city:a.me.name,price:money(a.basket),n:num(vals.length)}))}">
      ${stripSvg(vals, min, span, national)}<i class="strip-med" style="--at:${medAt}%"></i>
      <div class="hist-marker" style="--at:${at}%;--mk:${shade((a.basket-national)/(span/2)+.5)}"><span>${esc(a.me.name)}<b>${money(a.basket)}</b></span></div>
    </div><div class="hist-axis"><span>${money(min)}<small>${t('dash_lower')}</small></span><span class="axis-med" style="--at:${medAt}%"><strong>${money(national)}</strong><small>${t('dash_us_median')}</small></span><span>${money(max)}<small>${t('dash_higher')}</small></span></div>
    <p class="compare-foot">${t(it?'dash_compared_item':'dash_compared_count',{item:esc(metricLabel()),n:num(vals.length)})}</p>`;
  const delta = $('#hero-delta'), peerGap = a.med === null ? null : a.basket-a.med;
  delta.hidden = peerGap === null;
  if (peerGap !== null) {
    delta.classList.toggle('down',peerGap<0);
    delta.innerHTML = `${peerGap>0?'↑':peerGap<0?'↓':'='} ${money(Math.abs(peerGap))} (${Math.abs(peerGap/a.med*100).toFixed(0)}%)<small>${t('dash_vs_peers')}</small>`;
  }
}
function wireDashboard() {
  const m = state.data.meta, when = new Date(m.collected_utc);
  $('#snapshot-date').textContent = when.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  $('#snapshot-year').textContent = t('dash_captured',{year:when.getFullYear()});
  $('#quick-stats').innerHTML = [
    ['pin',num(m.cities_sampled),'dash_cities'],['taco',num(m.distinct_items),'dash_items'],
    ['grid',num(m.price_rows),'dash_prices'],['chart',num(state.data.book_count),'dash_books'],
  ].map(([icon,value,key]) => `<div class="quick-stat"><svg class="ico" aria-hidden="true"><use href="#i-${icon}"/></svg><div><strong>${value}</strong><small>${t(key)}</small></div></div>`).join('');
  renderDiscoveryList();
  $('#search-city').addEventListener('click',() => $('#hero-place').click());
  $('#nav-toggle').addEventListener('click',() => {
    const on = $('#nav-toggle').getAttribute('aria-expanded') !== 'true';
    $('#nav-toggle').setAttribute('aria-expanded',String(on));$('#main-nav').classList.toggle('open',on);
  });
  $('#main-nav').addEventListener('click',e => {
    if (!e.target.closest('a')) return;
    $('#main-nav').classList.remove('open');$('#nav-toggle').setAttribute('aria-expanded','false');
    $$('#main-nav a').forEach(a=>a.classList.toggle('active',a===e.target.closest('a')));
  });
  document.addEventListener('click',e => {
    const reveal = e.target.closest('[data-reveal]');
    if (reveal) {
      const target = document.getElementById(reveal.dataset.reveal);
      if (target) { e.preventDefault();target.open=true;pinTo(target);target.querySelector('summary')?.focus({preventScroll:true}); }
    }
    const item = e.target.closest('.menu-row[data-item]');
    if (item) openSpotlight(item.dataset.item);
    const sort = e.target.closest('[data-list][data-sort]');
    if (sort) {
      discoverySort[sort.dataset.list]=sort.dataset.sort;
      $$(`[data-list="${sort.dataset.list}"]`).forEach(b=>{b.classList.toggle('selected',b===sort);b.setAttribute('aria-pressed',String(b===sort));});
      renderDiscoveryList();
    }
  });
  // Give continuous decorative motion an explicit off switch as well as respecting OS settings.
  const motion = document.createElement('button');
  motion.type='button';motion.className='motion-toggle';motion.textContent=t('dash_pause_motion');motion.setAttribute('aria-pressed','false');
  $('.foot').append(motion);
  motion.addEventListener('click',()=>{
    const paused = document.documentElement.dataset.motion!=='paused';
    document.documentElement.dataset.motion=paused?'paused':'running';
    motion.textContent=t(paused?'dash_resume_motion':'dash_pause_motion');motion.setAttribute('aria-pressed',String(paused));
    if(state.hero)renderRank(state.hero);
  });
  // A modal must keep keyboard focus inside it, then return it to its opener.
  for(const dialog of [$('#city-pick'),$('#panel')]) {
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    dialog.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const focusable=[...dialog.querySelectorAll('button:not(:disabled),a[href],input,select,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(!first)return;
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
  }
}

/* ---------- wiring ---------- */
function rescale() {
  const vals = state.mode === 'stores'
    ? state.stores.map(storeValue).filter(v => v !== null && v !== undefined)
    : state.data.states.map(stateValue).filter(v => v !== null && v !== undefined);
  state.scale = makeScale(vals.length ? vals : [0, 1]);
}
function repaint() {
  rescale(); drawMap(); drawLegend(); renderTiers();
  $('#map-sub').textContent = state.metric === 'basket'
    ? t('map_sub_basket') : t('map_sub_item', { item: metricLabel() });
  $('#th-basket').textContent = state.metric === 'basket' ? t('th_basket') : metricLabel();
  $('#state-fold-sub').textContent = state.metric === 'basket'
    ? t('states_sub') : t('item_scope_states', { item: metricLabel() });
  if (state.city) {
    const a = analyzeCity(state.city.me);
    if (a) { state.city = a; paintHero(cityHero(a)); }
    renderNearby(state.city); renderDashboard();
  }
  const th = $('#state-table thead th[aria-sort]');
  renderStates(th?.dataset.sort || 'basket', th?.getAttribute('aria-sort') === 'ascending' ? 1 : -1);
  renderPeers();
}

/* The map needs whatever the chosen metric is keyed on: a state view of an
   item needs that item's file, a restaurant view needs every state's menus. */
function ensureMetricData() {
  const jobs = [];
  if (state.mode === 'stores') jobs.push(loadCore());
  if (state.metric !== 'basket') {
    jobs.push(loadItem(state.metric));
    /* The cities table, the nearby list and the restaurant map all price a
       single item out of the per-restaurant menus, so those come along the
       first time any item is picked and are cached from then on. */
    jobs.push(loadCore().then(loadAllStoreMenus));
  }
  if (!jobs.length) { repaint(); return; }
  $('#legend').innerHTML = `<span class="hint">${t('panel_loading')}</span>`;
  Promise.all(jobs).then(repaint).catch(err => {
    console.error(err);
    state.metric = 'basket'; syncPickers(); repaint();
  });
}

function setMode(mode) {
  state.mode = mode;
  $$('.seg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  if (mode === 'states') state.book = null;
  $$('#books .book').forEach(el => el.classList.toggle('on', +el.dataset.book === state.book));
  ensureMetricData();
}

function boot(data, map) {
  state.data = data; state.map = map;

  const when = new Date(data.meta.collected_utc);
  const fmt = when.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  $('#stamp').textContent = fmt;
  $('#foot-line').textContent = t('footer', { date: fmt });

  fillPickers();
  $$('#metric, .metric-pick').forEach(sel => {
    const lab = sel.closest('.picker')?.querySelector('span');
    if (lab) lab.textContent = t('pick_label');
  });

  $('#states-chip').textContent = t('states_chip', { n: num(data.states.length) });
  $('#bands-chip').textContent = t('bands_chip', { n: num(data.tiers.distinct) });
  $('#books-chip').textContent = t('books_chip', { n: num(data.book_count) });
  $('#items-chip').textContent = t('items_chip',
    { n: num(data.items.filter(i => i.coverage >= 0.5).length) });

  rescale();
  renderTiles(); drawMap(); drawLegend();
  renderStates(); renderItems(); renderTiers(); renderMethod(); renderOrder();
  wireCityPicker();
  wireDashboard();
  wireMore('#state-table', '#state-more');
  wireMore('#peer-table', '#peer-more');
  wireMore('#item-table', '#item-more');

  $('#peer-table tbody').innerHTML = `<tr><td colspan="6" class="empty">${t('panel_loading')}</td></tr>`;
  $('#geo-btn').disabled = true;
  Promise.all([loadCore(), loadPlaces()]).then(() => {
    $('#geo-btn').disabled = false;
    // every city, the default one included, is worked out from this week's data
    setCity(homeCity(), { scroll: false });
    if (state.mode === 'stores') repaint();
    // a link that arrives with #section lands on it once the page has drawn
    const hashed = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (hashed) pinTo(hashed);
    const pending = state.pendingState;
    if (pending) { state.pendingState = null; openState(pending); }
  }).catch(err => {
    console.error(err);
    $('#peer-table tbody').innerHTML =
      `<tr><td colspan="6" class="empty">${t('panel_error')}</td></tr>`;
    $('#national-comparison').innerHTML = `<p class="loading-copy">${t('error_load')}</p>`;
    $('#v-line').textContent = t('error_load');
    $('#verdict').hidden = false;
  });

  // the price books are a fetch of their own, so they wait until asked for
  $('#book-fold').addEventListener('toggle', e => { if (e.target.open) renderBooks(); });

  $$('#metric, .metric-pick').forEach(sel => sel.addEventListener('change', e => {
    state.metric = e.target.value; syncPickers(); ensureMetricData();
  }));
  $('#peer-filter').addEventListener('change', () => renderPeers());
  $$('.seg button').forEach(b => {
    b.classList.toggle('on', b.dataset.mode === state.mode);
    b.addEventListener('click', () => setMode(b.dataset.mode));
  });
  $('#sl-clear').addEventListener('click', closeSpotlight);
  $('#hero-reset').addEventListener('click', () => {
    setCity(homeCity(), { scroll: false });
    $('.hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // the cheaper-nearby card opens that restaurant's state
  const drive = $('#sub-drive');
  drive.addEventListener('click', () => { if (drive.dataset.code) openState(drive.dataset.code); });
  drive.addEventListener('keydown', e => {
    if (drive.dataset.code && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); openState(drive.dataset.code);
    }
  });

  wireMapZoom();

  const svg = $('#map');
  svg.addEventListener('pointermove', e => {
    const dot = e.target.closest('circle.dot-shop');
    if (dot) return showStoreTip(dot.dataset.id, e.clientX, e.clientY);
    const p = e.target.closest('path.st');
    if (p && !p.classList.contains('nodata')) showStateTip(p.dataset.code, e.clientX, e.clientY);
    else hideTip();
  });
  svg.addEventListener('pointerleave', hideTip);
  svg.addEventListener('click', e => {
    const dot = e.target.closest('circle.dot-shop');
    if (dot) {
      const s = state.stores.find(x => x.id === dot.dataset.id);
      if (s) { hideTip(); openState(s.state); }
      return;
    }
    const p = e.target.closest('path.st');
    if (p && !p.classList.contains('nodata')) { hideTip(); openState(p.dataset.code); }
  });
  svg.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const p = e.target.closest('path.st');
    if (p && !p.classList.contains('nodata')) { e.preventDefault(); openState(p.dataset.code); }
  });

  for (const sel of ['#state-table', '#peer-table']) {
    $(sel).addEventListener('click', e => {
      const tr = e.target.closest('tr[data-code]');
      if (tr) openState(tr.dataset.code);
    });
    $(sel).addEventListener('keydown', e => {
      const tr = e.target.closest('tr[data-code]');
      if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openState(tr.dataset.code); }
    });
  }

  for (const ev of ['click', 'keydown']) {
    $('#order-receipt').addEventListener(ev, e => {
      const li = e.target.closest('li[data-item]');
      if (!li) return;
      if (ev === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openSpotlight(li.dataset.item);
    });
  }

  $('#item-table').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-item]');
    if (tr) openSpotlight(tr.dataset.item);
  });
  $('#item-table').addEventListener('keydown', e => {
    const tr = e.target.closest('tr[data-item]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSpotlight(tr.dataset.item); }
  });

  $('#books').addEventListener('click', e => {
    const b = e.target.closest('.book');
    if (b) pickBook(+b.dataset.book);
  });
  $('#books').addEventListener('keydown', e => {
    const b = e.target.closest('.book');
    if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickBook(+b.dataset.book); }
  });

  wireSort('#state-table', renderStates);
  wireSort('#peer-table', renderPeers);
  wireSort('#item-table', renderItems);

  $('#p-close').addEventListener('click', closeState);
  $('#scrim').addEventListener('click', closeState);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.open) closeState(); });

  $('#theme-toggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('tbpm-theme', next); } catch {}
    repaint();
    if (state.booksDrawn) { state.booksDrawn = false; renderBooks(); }
    if (state.spot) openSpotlight(state.spot);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) repaint();
  });

  const hash = location.hash.slice(1).toUpperCase();
  if (hash && data.states.some(s => s.code === hash)) openState(hash);
}

try {
  const saved = localStorage.getItem('tbpm-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch {}

Promise.all([
  fetch('data/dashboard.json').then(r => r.json()),
  fetch('data/us-map.json').then(r => r.json()),
]).then(([d, m]) => boot(d, m)).catch(err => {
  console.error(err);
  $('#v-badge').textContent = '';
  $('#v-line').textContent = t('error_load');
  $('#verdict').hidden = false;
});
})();
