const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=tsv";

// Lab coordinates
const lab = { name: "Cell Chip Group", lat: 48.20131190157764, lng: 16.36347258815447 };



// Calculate distance
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Price category helper
function priceCategory(price) {
  if (!Number.isFinite(price)) return '—';
  if (price <= 10) return '≤10€';
  if (price < 13) return '<13€';
  if (price < 15) return '<15€';
  return '≥15€';
}

// === LOAD DATA FROM SHEET ===
async function loadData() {
  const res = await fetch(sheetURL);
  const text = await res.text();

  // Split into lines (robust to CRLF)
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split("\t"); // not used here but kept for clarity
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const cols = line.split("\t").map(s => s.trim());

    return {
      name: cols[0] || "Unknown",
      price: cols[2] ? parseFloat(cols[2]) : NaN,
      link: cols[3] || "",
      avg_rating: cols[4] ? parseFloat(cols[4]) : 0,
      n_ratings: cols[5] ? parseInt(cols[5], 10) : 0,
      lat: parseFloat(cols[6]),
      lng: parseFloat(cols[7])
    };
  });
}

async function buildList() {
  const places = await loadData();
  const list = document.getElementById("list");

  // inject minimal scoped styles for a modern card layout
  const styleId = 'linktree-modern-styles';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      :root{--accent:#8aa6ff;--muted:#6b7280;--bg:#fbfbff;--card:#ffffff}
      body{background:var(--bg);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial;margin:24px}
      h1{text-align:center;margin:8px 0 18px;color:#0f172a;font-size:20px}
      #list{max-width:820px;margin:18px auto;padding:12px}
      .linktree-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}
      .lt-card{display:flex;gap:14px;align-items:center;padding:12px 14px;background:var(--card);border-radius:12px;box-shadow:0 6px 18px rgba(16,24,40,0.04);border:1px solid rgba(138,166,255,0.12);transition:transform .12s ease,box-shadow .12s ease}
      .lt-card:hover{transform:translateY(-4px);box-shadow:0 10px 26px rgba(16,24,40,0.08)}
      .lt-index{min-width:40px;height:40px;display:inline-grid;place-items:center;background:linear-gradient(180deg,var(--accent),#7da0ff);color:white;font-weight:700;border-radius:10px;font-size:15px}
      .lt-content{flex:1;min-width:0}
      .lt-name{display:block;color:#0f172a;text-decoration:none;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .lt-meta{display:flex;gap:10px;align-items:center;margin-top:6px;font-size:13px;color:var(--muted)}
      .lt-price{background:rgba(138,166,255,0.12);color:var(--accent);padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px}
      .lt-rating{display:inline-flex;align-items:center;gap:6px}
      .lt-meta .nr{color:var(--muted);font-size:12px}
      .lt-link{display:block;color:inherit;text-decoration:none}

      /* stars (scoped) */
      .lt-stars{display:inline-block;font-size:13px;line-height:1}
      .lt-stars .star{display:inline-block;position:relative;color:#e6e6e6;width:1em;text-align:center}
      .lt-stars .star::before{content:'★';position:absolute;left:0;top:0;color:#f6c84c;width:0;overflow:hidden}
      .lt-stars .star.full::before{width:100%}
      .lt-stars .star.half::before{width:50%}
    `;
    document.head.appendChild(s);
  }

  // prepare list container
  list.innerHTML = '';
  list.classList.add('linktree-list');

  function starsHTML(avg, n) {
    const full = Math.floor(avg);
    const half = (avg - full) >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '<span class="lt-stars">';
    for (let i = 0; i < full; i++) html += '<span class="star full">★</span>';
    if (half) html += '<span class="star half">★</span>';
    for (let i = 0; i < empty; i++) html += '<span class="star">★</span>';
    html += '</span>';
    if (avg) html += ` <span class="nr">(${n || 0})</span>`;
    return html;
  }

  // Sort by distance. Use L.latLng.distanceTo for robust distance calculation.
  const sorted = places
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)) // filter out bad rows
    .map(p => ({
      ...p,
      dist: distance(lab.lat, lab.lng, p.lat, p.lng)
    }))
    .sort((a, b) => a.dist - b.dist);

  sorted.forEach((p, idx) => {
    const li = document.createElement("li");
    li.className = 'lt-item';

    const priceText = priceCategory(p.price);
    const ratingHTML = p.avg_rating ? starsHTML(p.avg_rating, p.n_ratings) : '<span class="nr">No rating</span>';

    li.innerHTML = `
      <a class="lt-link" href="${p.link}" target="_blank" rel="noopener">
        <div class="lt-card">
          <div class="lt-index">${idx + 1}</div>
          <div class="lt-content">
            <div class="lt-name">${p.name}</div>
            <div class="lt-meta">
              <div class="lt-rating">${ratingHTML}</div>
              <div class="lt-price">${priceText}</div>
            </div>
          </div>
        </div>
      </a>
    `;

    list.appendChild(li);
  });
}

buildList();
