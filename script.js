// === CONFIG ===
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=csv";

// Lab coordinates
const lab = { name: "Cell Chip Group", lat: 48.20131190157764, lng: 16.36347258815447 };

// Simple CSV line parser that handles quoted fields and doubled quotes.
// Returns an array of fields for a single CSV line.
function parseCSVLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped double-quote ("")
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        cur += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// === LOAD DATA FROM SHEET ===
async function loadData() {
  const res = await fetch(sheetURL);
  const text = await res.text();
  // Split into lines first (preserve quoted commas inside lines)
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  // Parse header if you need it
  const header = parseCSVLine(lines[0]);

  // Parse data lines with CSV-aware parser
  const dataLines = lines.slice(1);
  return dataLines.map(line => {
    const cols = parseCSVLine(line);

    // If coordinates are stored as a single "lat,lng" field in one column, parse that
    // Otherwise, if they are in two separate columns, adjust indexes below.
    // Example assumes:
    // cols[0] = name
    // cols[1] = "lat,lng"  OR lat  (if two-field CSV this would be lat)
    // cols[2] = price (or lng if two-field)
    // cols[3] = link
    // cols[4] = avg_rating (optional)
    // cols[5] = n_ratings (optional)

    let lat, lng;
    // If coords are in one column like "48.2,16.36"
    if (cols[1] && cols[1].includes(",")) {
      const parts = cols[1].split(",").map(s => s.trim());
      lat = parseFloat(parts[0]);
      lng = parseFloat(parts[1]);
    } else {
      // assume lat and lng are separate columns
      lat = parseFloat(cols[1]);
      lng = parseFloat(cols[2]);
    }

    // Determine indices for the rest depending on above assumption
    let priceIdx, linkIdx, ratingIdx, nratingsIdx;
    if (cols[1] && cols[1].includes(",")) {
      priceIdx = 2;
      linkIdx = 3;
      ratingIdx = 4;
      nratingsIdx = 5;
    } else {
      priceIdx = 3;
      linkIdx = 4;
      ratingIdx = 5;
      nratingsIdx = 6;
    }

    const price = priceIdx < cols.length ? parseFloat(cols[priceIdx]) : NaN;
    const link = linkIdx < cols.length ? cols[linkIdx] : "";
    const avg_rating = ratingIdx < cols.length ? parseFloat(cols[ratingIdx] || 0) : 0;
    const n_ratings = nratingsIdx < cols.length ? parseInt(cols[nratingsIdx] || 0, 10) : 0;

    return {
      name: cols[0] || "Unknown",
      lat: lat,
      lng: lng,
      price: isNaN(price) ? null : price,
      link: link,
      avg_rating: isNaN(avg_rating) ? 0 : avg_rating,
      n_ratings: isNaN(n_ratings) ? 0 : n_ratings
    };
  });
}


// === INIT MAP ===
async function initMap() {
  const places = await loadData();

  const map = L.map('map').setView([lab.lat, lab.lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Draw walking circles (~80 m/min)
  L.circle([lab.lat, lab.lng], { radius: 400, color: 'blue', fillOpacity: 0.05 }).addTo(map); // 5 min
  L.circle([lab.lat, lab.lng], { radius: 800, color: 'green', fillOpacity: 0.05 }).addTo(map); // 10 min

  // Sort by distance. Use L.latLng.distanceTo for robust distance calculation.
  const origin = L.latLng(lab.lat, lab.lng);
  const sorted = places.map(p => ({
    ...p,
    dist: L.latLng(p.lat, p.lng).distanceTo(origin)
  })).sort((a, b) => a.dist - b.dist);

  sorted.forEach((p, i) => {
    const marker = L.marker([p.lat, p.lng]).addTo(map);
    const priceText = p.price === null ? "—" : `${p.price} €`;
    marker.bindPopup(`<b>${i + 1}. ${p.name}</b><br>${priceText}<br>
      <a href="${p.link}" target="_blank" rel="noopener">Google Maps</a>`);
  });

  // QR code for linktree
  new QRCode(document.getElementById("qrcode"), window.location.href.replace("index.html", "linktree.html"));
}

initMap();
