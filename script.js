// === CONFIG ===
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=tsv";
const googleformURL = "https://docs.google.com/forms/d/e/1FAIpQLScpqLpmlC3kCDIxOuPzinEKpljgQeTXc22EjfFew_nDt4rvhQ/viewform?usp=dialog";
const mapURL = "https://cellcheapmeals-hub.github.io/mealmap/";
const linktreeURL = "https://cellcheapmeals-hub.github.io/mealmap/linktree.html";

// Lab coordinates
const lab = { name: "Cell Chip Group", lat: 48.20131190157764, lng: 16.36347258815447 };

// Create QR code in a container element
function createQRCode(container, text) {
  new QRCode(container, {
    text: text,
    width: 50,
    height: 50,
    correctLevel: QRCode.CorrectLevel.H
  });
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


// Create origin marker: try loading an image, fall back to a styled div icon
function addOriginMarker(map) {
  const imgUrl = 'images/origin.png';
  const popupHtml = `<b>${lab.name}</b>`;

  const img = new Image();
  img.onload = function() {
    const originIcon = L.icon({
      iconUrl: imgUrl,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
    L.marker([lab.lat, lab.lng], { icon: originIcon }).addTo(map).bindPopup(popupHtml);
  };
  img.onerror = function() {
    // fallback: circular div icon
    const originDiv = L.divIcon({
      className: 'origin-div-icon',
      html: `<div class="origin-dot"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
    L.marker([lab.lat, lab.lng], { icon: originDiv }).addTo(map).bindPopup(popupHtml);
  };
  img.src = imgUrl;
}

// === INIT MAP ===
async function initMap() {
  const places = await loadData();
  console.log("Parsed places:", places); // debug: inspect parsed data in console

  const map = L.map('map').setView([lab.lat, lab.lng],15);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Draw walking circles (~80 m/min)
  const circle5 = L.circle([lab.lat, lab.lng], { radius: 400, color: 'blue', fillOpacity: 0.05 }).addTo(map); // 5 min
  const circle10 = L.circle([lab.lat, lab.lng], { radius: 800, color: 'green', fillOpacity: 0.05 }).addTo(map); // 10 min

  // Helper: convert meters + bearing to latitude/longitude offset (approx)
  function metersToLatLng(lat, lng, meters, bearingDeg) {
    const br = bearingDeg * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const deltaLat = (meters * Math.cos(br)) / 110574; // meters per degree latitude
    const deltaLng = (meters * Math.sin(br)) / (111320 * Math.cos(latRad)); // meters per degree longitude
    return [lat + deltaLat, lng + deltaLng];
  }

  // Simple boxed labels on top (north) of the circles
  const labelOffset = 12; // meters outside the circle
  const label5Pos = metersToLatLng(lab.lat, lab.lng, 400 + labelOffset, 0); // north
  const label10Pos = metersToLatLng(lab.lat, lab.lng, 800 + labelOffset, 0);

  const boxedLabelIcon = (text) => L.divIcon({
    className: 'circle-label',
    html: `<div>${text}</div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 12]
  });

  L.marker(label5Pos, { icon: boxedLabelIcon('5 min'), interactive: false, keyboard: false }).addTo(map);
  L.marker(label10Pos, { icon: boxedLabelIcon('10 min'), interactive: false, keyboard: false }).addTo(map);

  // add origin marker (image if available, otherwise styled fallback)
  addOriginMarker(map);

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

  const priceText = priceCategory(p.price);

  function starsHTML(avg, n) {
    const full = Math.floor(avg);
    const half = (avg - full) >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '<span class="stars">';
    for (let i = 0; i < full; i++) html += '<span class="star full">★</span>';
    if (half) html += '<span class="star half">★</span>';
    for (let i = 0; i < empty; i++) html += '<span class="star">★</span>';
    html += '</span>';
    if (avg) html += ` (${n || 0})`;
    return html;
  }

  const ratingText = p.avg_rating
    ? starsHTML(p.avg_rating, p.n_ratings)
    : 'No rating';

  // Combine all info into popup HTML
  const popupHTML = `
    <b>${i + 1}. ${p.name}</b><br>
    ${priceText}<br>
    ${ratingText}<br>
    <a href="${p.link}" target="_blank" rel="noopener">Google Maps</a>
  `;

  standardMarker.bindPopup(popupHTML);
    
});



}

// Price category helper
function priceCategory(price) {
  if (!Number.isFinite(price)) return '—';
  if (price <= 10) return '≤10€';
  if (price < 13) return '<13€';
  if (price < 15) return '<15€';
  return '≥15€';
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("qrcode1 container:", document.querySelector('#qrcode1 .qrcode-container'));
  console.log("qrcode2 container:", document.querySelector('#qrcode2 .qrcode-container'));
  console.log("qrcode3 container:", document.querySelector('#qrcode3 .qrcode-container'));

  

  const items = [
    { id: 'qrcode1', url: linktreeURL },
    { id: 'qrcode2', url: googleformURL },
    { id: 'qrcode3', url: mapURL }
  ];

  const isHttp = /^https?:\/\//i.test(location.href);

  items.forEach(it => {
    const el = document.getElementById(it.id);
    if (!el) return;
    const container = el.querySelector('.qrcode-container');
    if (!container) return;
    // clear any existing content
    container.innerHTML = '';

    // create QR code with consistent size
    new QRCode(container, {
      text: it.url,
      width: 64,
      height: 64,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    // link activation: only add href when served over http(s)
    const a = el.querySelector('.qrcode-label a');
    if (a) {
      const dataUrl = a.getAttribute('data-url') || it.url;
      if (isHttp) {
        a.setAttribute('href', dataUrl);
        a.setAttribute('target', '_blank');
        a.classList.remove('disabled');
      } else {
        a.removeAttribute('href');
        a.classList.add('disabled');
        a.title = 'Open in browser to use link';
      }
    }
  });

  initMap();
});


