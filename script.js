// === CONFIG ===
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=csv";

// Lab coordinates
const lab = { name: "Cell Chip Group", lat: 48.20131190157764, lng: 16.36347258815447 };

// === LOAD DATA FROM SHEET ===
async function loadData() {
  const res = await fetch(sheetURL);
  const text = await res.text();

  // Split into lines (robust to CRLF)
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split(","); // not used here but kept for clarity
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const cols = line.split(",").map(s => s.trim());

    // Handle two possible formats:
    // - coords in one column like "48.2,16.36" in cols[1]
    // - coords in two separate columns: cols[1] = lat, cols[2] = lng
    let lat, lng;
    if (cols[1] && cols[1].includes(",")) {
      const parts = cols[1].split(",").map(s => s.trim());
      lat = parseFloat(parts[0]);
      lng = parseFloat(parts[1]);
    } else {
      lat = parseFloat(cols[1]);
      lng = parseFloat(cols[2]);
    }

    return {
      name: cols[0] || "Unknown",
      lat: lat,
      lng: lng,
      price: cols[3] ? parseFloat(cols[3]) : NaN,
      link: cols[4] || "",
      avg_rating: cols[5] ? parseFloat(cols[5]) : 0,
      n_ratings: cols[6] ? parseInt(cols[6], 10) : 0
    };
  });
}


// === INIT MAP ===
async function initMap() {
  const places = await loadData();
  console.log("Parsed places:", places); // debug: inspect parsed data in console

  const map = L.map('map').setView([lab.lat, lab.lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Draw walking circles (~80 m/min)
  L.circle([lab.lat, lab.lng], { radius: 400, color: 'blue', fillOpacity: 0.05 }).addTo(map); // 5 min
  L.circle([lab.lat, lab.lng], { radius: 800, color: 'green', fillOpacity: 0.05 }).addTo(map); // 10 min

  // Sort by distance. Use L.latLng.distanceTo for robust distance calculation.
  const origin = L.latLng(lab.lat, lab.lng);
  const sorted = places
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)) // filter out bad rows
    .map(p => ({
      ...p,
      dist: L.latLng(p.lat, p.lng).distanceTo(origin)
    }))
    .sort((a, b) => a.dist - b.dist);

  sorted.forEach((p, i) => {
    const marker = L.marker([p.lat, p.lng]).addTo(map);
    const priceText = Number.isFinite(p.price) ? `${p.price} €` : "—";
    marker.bindPopup(`<b>${i + 1}. ${p.name}</b><br>${priceText}<br>
      <a href="${p.link}" target="_blank" rel="noopener">Google Maps</a>`);
  });

  // QR code for linktree
  new QRCode(document.getElementById("qrcode"), window.location.href.replace("index.html", "linktree.html"));
}

initMap();
