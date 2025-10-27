// === CONFIG ===
const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=csv";

// Lab coordinates
const lab = { name: "TU Wien Biomedical Lab", lat: 48.1987, lng: 16.3695 };

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

  // Draw walking circles (~80 m/min)
  L.circle([lab.lat, lab.lng], { radius: 400, color: 'blue', fillOpacity: 0.05 }).addTo(map); // 5 min
  L.circle([lab.lat, lab.lng], { radius: 800, color: 'green', fillOpacity: 0.05 }).addTo(map); // 10 min

  // Sort by distance
  const sorted = places.map(p => ({
    ...p,
    dist: map.distance([lab.lat, lab.lng], [p.lat, p.lng])
  })).sort((a, b) => a.dist - b.dist);

  sorted.forEach((p, i) => {
    const marker = L.marker([p.lat, p.lng]).addTo(map);
    marker.bindPopup(`<b>${i + 1}. ${p.name}</b><br>${p.price} €<br>
      <a href="${p.link}" target="_blank">Google Maps</a>`);
  });

  // QR code for linktree
  new QRCode(document.getElementById("qrcode"), window.location.href.replace("index.html", "linktree.html"));
}

initMap();
