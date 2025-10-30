const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=656287312&single=true&output=tsv";

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
      lng: parseFloat(cols[7]),
      comment: cols[8] || "",
      vegan: cols[9] === "TRUE",
      veggie: cols[10] === "TRUE",
      cuisine: cols[11] || ""
    };
  });
}

// Global variables for filtering
let allPlaces = [];
let currentFilters = {
  vegan: false,
  veggie: false,
  cuisine: null
};

async function buildList(filters = currentFilters) {
  if (allPlaces.length === 0) {
    allPlaces = await loadData();
  }
  
  const list = document.getElementById("list");

  // inject minimal scoped styles for a modern card layout
  const styleId = 'linktree-modern-styles';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      :root{--accent:#8aa6ff;--muted:#6b7280;--bg:#fbfbff;--card:#ffffff}
      body{background:var(--bg);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial;margin:24px}
      .header{display:flex;align-items:center;justify-content:center;gap:16px;margin:8px 0 18px;flex-wrap:wrap}
      h1{color:#0f172a;font-size:20px;margin:0}
      #list{max-width:820px;margin:18px auto;padding:12px}
      .linktree-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}
      .lt-card{display:flex;gap:14px;align-items:center;padding:12px 14px;background:var(--card);border-radius:12px;box-shadow:0 6px 18px rgba(16,24,40,0.04);border:1px solid rgba(138,166,255,0.12);transition:transform .12s ease,box-shadow .12s ease}
      .lt-card:hover{transform:translateY(-4px);box-shadow:0 10px 26px rgba(16,24,40,0.08)}
      .lt-index{min-width:40px;height:40px;display:inline-grid;place-items:center;background:linear-gradient(180deg,var(--accent),#7da0ff);color:white;font-weight:700;border-radius:10px;font-size:15px}
      .lt-content{flex:1;min-width:0}
      .lt-comment-right{margin-left:auto;max-width:200px}
      .lt-name{display:block;color:#0f172a;text-decoration:none;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .lt-meta{display:flex;gap:10px;align-items:center;margin-top:6px;font-size:13px;color:var(--muted)}
      .lt-price{background:rgba(138,166,255,0.12);color:var(--accent);padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px}
      .lt-distance{background:rgba(138,166,255,0.12);color:var(--accent);padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px}
      .lt-vegan{background:#dcfce7;color:#16a34a;padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px}
      .lt-veggie{background:#fef3c7;color:#d97706;padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px}
      .lt-cuisine{background:#f1f5f9;color:#475569;padding:4px 8px;border-radius:999px;font-weight:600;font-size:12px}
      .lt-comment{background:#f3f4f6;color:#6b7280;padding:4px 8px;border-radius:999px;font-size:12px;font-style:italic}
      .lt-rating{display:inline-flex;align-items:center;gap:6px}
      .lt-meta .nr{color:var(--muted);font-size:12px}
      .lt-link{display:block;color:inherit;text-decoration:none}

      /* filter section */
      .filter-section{position:relative}
      .filter-toggle{display:inline-flex;align-items:center;gap:8px;background:var(--card);color:var(--muted);border:1px solid rgba(138,166,255,0.12);padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s ease;user-select:none;box-shadow:0 2px 6px rgba(16,24,40,0.04)}
      .filter-toggle:hover{background:#f8fafc;border-color:var(--accent);color:var(--accent)}
      .filter-toggle.active{background:var(--accent);color:white;border-color:var(--accent)}
      .filter-toggle-icon{transition:transform .2s ease}
      .filter-toggle.active .filter-toggle-icon{transform:rotate(180deg)}
      .filter-bar{display:none;gap:8px;flex-wrap:wrap;position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:12px;padding:16px;background:var(--card);border-radius:12px;box-shadow:0 4px 12px rgba(16,24,40,0.15);border:1px solid rgba(138,166,255,0.12);z-index:10;min-width:300px}
      .filter-bar.show{display:flex}
      .content-wrapper{margin-bottom:20px}
      .filter-btn{background:var(--bg);color:var(--muted);border:1px solid #e5e7eb;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s ease;user-select:none}
      .filter-btn:hover{background:#f3f4f6;border-color:var(--accent)}
      .filter-btn.active{background:var(--accent);color:white;border-color:var(--accent)}
      .filter-btn.vegan{background:#dcfce7;color:#16a34a;border-color:#86efac}
      .filter-btn.vegan.active{background:#16a34a;color:white}
      .filter-btn.veggie{background:#fef3c7;color:#d97706;border-color:#fbbf24}
      .filter-btn.veggie.active{background:#d97706;color:white}

      /* stars (scoped) */
      .lt-stars{display:inline-block;font-size:13px;line-height:1}
      .lt-stars .star{display:inline-block;position:relative;color:#e6e6e6;width:1em;text-align:center}
      .lt-stars .star::before{content:'★';position:absolute;left:0;top:0;color:#f6c84c;width:0;overflow:hidden}
      .lt-stars .star.full::before{width:100%}
      .lt-stars .star.half::before{width:50%}
    `;
    document.head.appendChild(s);
  }

  // Create header structure if it doesn't exist
  let header = document.querySelector('.header');
  if (!header) {
    const h1 = document.querySelector('h1');
    header = document.createElement('div');
    header.className = 'header';
    
    // Move h1 into header
    h1.parentNode.insertBefore(header, h1);
    header.appendChild(h1);
    
    // Create filter section in header
    const filterSection = document.createElement('div');
    filterSection.id = 'filter-section';
    filterSection.className = 'filter-section';
    header.appendChild(filterSection);
    
    // Add content wrapper class to organize layout
    list.classList.add('content-wrapper');
  }
  
  // Create filter section content
  let filterSection = document.getElementById('filter-section');
  if (filterSection && !filterSection.hasChildNodes()) {
    
    // Get unique cuisines for filter buttons
    const uniqueCuisines = [...new Set(allPlaces.map(p => p.cuisine).filter(c => c && c.trim()))].sort();
    
    const hasActiveFilters = filters.vegan || filters.veggie || filters.cuisine;
    
    filterSection.innerHTML = `
      <div class="filter-toggle ${hasActiveFilters ? 'active' : ''}" id="filter-toggle">
        <span>🔍 Filter</span>
        <span class="filter-toggle-icon">▼</span>
      </div>
      <div class="filter-bar ${hasActiveFilters ? 'show' : ''}" id="filter-bar">
        <div class="filter-btn ${filters.vegan ? 'active' : ''} vegan" data-filter="vegan">🌱 Vegan</div>
        <div class="filter-btn ${filters.veggie ? 'active' : ''} veggie" data-filter="veggie">🥬 Veggie</div>
        ${uniqueCuisines.map(cuisine => 
          `<div class="filter-btn ${filters.cuisine === cuisine ? 'active' : ''}" data-filter="cuisine" data-value="${cuisine}">🍴 ${cuisine}</div>`
        ).join('')}
        <div class="filter-btn ${!filters.vegan && !filters.veggie && !filters.cuisine ? 'active' : ''}" data-filter="clear">Clear All</div>
      </div>
    `;
    
    // Add event listeners
    const filterToggle = document.getElementById('filter-toggle');
    const filterBar = document.getElementById('filter-bar');
    
    filterToggle.addEventListener('click', () => {
      filterBar.classList.toggle('show');
    });
    
    filterBar.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        handleFilterClick(e.target);
      }
    });
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

  // Sort by distance and assign original indices
  const allSorted = allPlaces
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map(p => ({
      ...p,
      dist: distance(lab.lat, lab.lng, p.lat, p.lng)
    }))
    .sort((a, b) => a.dist - b.dist)
    .map((p, idx) => ({ ...p, originalIndex: idx + 1 }));

  // Filter the sorted list while preserving original indices
  const sorted = allSorted.filter(p => {
    if (filters.vegan && !p.vegan) return false;
    if (filters.veggie && !p.veggie) return false;
    if (filters.cuisine && p.cuisine !== filters.cuisine) return false;
    return true;
  });

  sorted.forEach((p) => {
    const li = document.createElement("li");
    li.className = 'lt-item';

    const priceText = priceCategory(p.price);
    const distanceText = p.dist < 1000 ? `${Math.round(p.dist)}m` : `${(p.dist / 1000).toFixed(1)}km`;
    const ratingHTML = p.avg_rating ? starsHTML(p.avg_rating, p.n_ratings) : '<span class="nr">No rating</span>';
    const veganHTML = p.vegan ? '<div class="lt-vegan">🌱 vegan</div>' : '';
    const veggieHTML = p.veggie ? '<div class="lt-veggie">🥬 veggie</div>' : '';
    const cuisineHTML = p.cuisine && p.cuisine.trim() ? `<div class="lt-cuisine">🍴 ${p.cuisine}</div>` : '';

    const commentHTML = p.comment ? `<div class="lt-comment-right"><div class="lt-comment">${p.comment}</div></div>` : '';
    
    li.innerHTML = `
      <a class="lt-link" href="${p.link}" target="_blank" rel="noopener">
        <div class="lt-card">
          <div class="lt-index">${p.originalIndex}</div>
          <div class="lt-content">
            <div class="lt-name">${p.name}</div>
            <div class="lt-meta">
              <div class="lt-rating">${ratingHTML}</div>
              <div class="lt-price">${priceText}</div>
              <div class="lt-distance">${distanceText}</div>
              ${veganHTML}
              ${veggieHTML}
              ${cuisineHTML}
            </div>
          </div>
          ${commentHTML}
        </div>
      </a>
    `;

    list.appendChild(li);
  });
}

// Filter handling function
function handleFilterClick(button) {
  const filterType = button.dataset.filter;
  const filterValue = button.dataset.value;
  
  if (filterType === 'clear') {
    currentFilters = { vegan: false, veggie: false, cuisine: null };
  } else if (filterType === 'vegan') {
    currentFilters.vegan = !currentFilters.vegan;
    if (currentFilters.vegan) currentFilters.veggie = false; // exclusive
  } else if (filterType === 'veggie') {
    currentFilters.veggie = !currentFilters.veggie;
    if (currentFilters.veggie) currentFilters.vegan = false; // exclusive
  } else if (filterType === 'cuisine') {
    currentFilters.cuisine = currentFilters.cuisine === filterValue ? null : filterValue;
  }
  
  // Update button states
  const filterBar = document.getElementById('filter-bar');
  const filterToggle = document.getElementById('filter-toggle');
  
  filterBar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (currentFilters.vegan) {
    filterBar.querySelector('[data-filter="vegan"]').classList.add('active');
  }
  if (currentFilters.veggie) {
    filterBar.querySelector('[data-filter="veggie"]').classList.add('active');
  }
  if (currentFilters.cuisine) {
    filterBar.querySelector(`[data-filter="cuisine"][data-value="${currentFilters.cuisine}"]`).classList.add('active');
  }
  if (!currentFilters.vegan && !currentFilters.veggie && !currentFilters.cuisine) {
    filterBar.querySelector('[data-filter="clear"]').classList.add('active');
  }
  
  // Update toggle button state
  const hasActiveFilters = currentFilters.vegan || currentFilters.veggie || currentFilters.cuisine;
  if (hasActiveFilters) {
    filterToggle.classList.add('active');
    filterBar.classList.add('show');
  } else {
    filterToggle.classList.remove('active');
  }
  
  buildList(currentFilters);
}

buildList();
