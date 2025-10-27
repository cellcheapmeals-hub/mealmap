// === CONFIG ===
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=tsv";

// Lab coordinates
const lab = { name: "Cell Chip Group", lat: 48.20131190157764, lng: 16.36347258815447 };

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
  const standardMarker = L.marker([p.lat, p.lng]).addTo(map);

  const numberMarker = L.marker([p.lat, p.lng], {
    icon: L.divIcon({
      className: 'number-overlay',
      html: `<div>${i + 1}</div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    }),
    interactive: false
  }).addTo(map);

  const priceText = Number.isFinite(p.price) ? `${p.price} €` : "—";

  // Create stars string (★ for filled, ☆ for empty)
  const fullStars = Math.round(p.avg_rating || 0);
  const stars = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
  const ratingText = p.avg_rating
    ? `${stars} (${p.n_ratings || 0})`
    : "No rating";

  // Combine all info into popup HTML
  const popupHTML = `
    <b>${i + 1}. ${p.name}</b><br>
    ${priceText}<br>
    ${ratingText}<br>
    <a href="${p.link}" target="_blank" rel="noopener">Google Maps</a>
  `;

  standardMarker.bindPopup(popupHTML);
});


  // QR code for linktree
  new QRCode(document.getElementById("qrcode"), window.location.href.replace("index.html", "linktree.html"));
}

initMap();
