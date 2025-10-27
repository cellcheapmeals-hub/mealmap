// === CONFIG ===
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=csv";

// Lab coordinates
const lab = { name: "Cell Chip Group", lat: 48.20131190157764, lng: 16.36347258815447 };

// === LOAD DATA FROM SHEET ===
async function loadData() {
  const res = await fetch(sheetURL);
  const text = await res.text();
  const rows = text.trim().split("\n").map(r => r.split(",")); // split CSV by comma
  const [header, ...data] = rows;

  return data.map(r => {
    // Split "Coordinates" column into lat & lng
    const [lat, lng] = r[1].split(",").map(Number);

    return {
      name: r[0],            // Name
      lat: lat,              // Latitude
      lng: lng,              // Longitude
      price: parseFloat(r[2]),       // Price
      link: r[3],            // GoogleLink
      avg_rating: parseFloat(r[4] || 0), // avg_rating (optional)
      n_ratings: parseInt(r[5] || 0)    // n_ratings (optional)
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

  // Circles for walk times
  L.circle([lab.lat, lab.lng], { radius: 400, color: 'blue', fillOpacity: 0.05 }).addTo(map);
  L.circle([lab.lat, lab.lng], { radius: 800, color: 'green', fillOpacity: 0.05 }).addTo(map);

  // Sort by distance
  const sorted = places.map(p => ({
    ...p,
    dist: map.distance([lab.lat, lab.lng], [p.lat, p.lng])
  })).sort((a, b) => a.dist - b.dist);

  // Add markers
  sorted.forEach((p, i) => {
    const marker = L.marker([p.lat, p.lng]).addTo(map);
    const starText = stars(p.rating);
    marker.bindPopup(`<b>${i + 1}. ${p.name}</b><br>${p.price} €<br>${starText}<br>
      <a href="${p.link}" target="_blank">Google Maps</a>`);
  });

  // === Create legend ===
  const legend = L.control({ position: "topright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = "<b>Places by distance</b><br>";
    sorted.forEach((p, i) => {
      div.innerHTML += `${i + 1}. ${p.name} – ${stars(p.rating)}<br>`;
    });
    return div;
  };
  legend.addTo(map);

  // === QR Codes ===
  new QRCode(document.getElementById("qrcode"), window.location.href.replace("index.html", "linktree.html"));
  new QRCode(document.getElementById("sheetqr"), sheetEditURL);
}

initMap();
