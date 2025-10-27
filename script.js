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
// === INIT MAP ===
async function initMap() {
  const places = await loadData();

  // Create map centered at lab
  const map = L.map('map').setView([lab.lat, lab.lng], 16);

  // Grey/light tile layer
  L.tileLayer('https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Walking circles (~80 m/min)
  L.circle([lab.lat, lab.lng], { radius: 400, color: 'blue', fillOpacity: 0.05 }).addTo(map); // 5 min
  L.circle([lab.lat, lab.lng], { radius: 800, color: 'green', fillOpacity: 0.05 }).addTo(map); // 10 min

  // Function to color markers based on avg_rating
  function getColor(rating) {
    if (rating >= 4) return "#2ECC71";   // green
    if (rating >= 3) return "#F1C40F";   // yellow
    return "#E74C3C";                     // red
  }

  // Sort places by distance from lab
  const sorted = places.map(p => ({
    ...p,
    dist: map.distance([lab.lat, lab.lng], [p.lat, p.lng])
  })).sort((a, b) => a.dist - b.dist);

  // Add circle markers
  sorted.forEach((p, i) => {
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 8,                  // marker size
      fillColor: getColor(p.avg_rating),
      color: "#000",              // border
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map);

    // Popup with details
    marker.bindPopup(`
      <b>${i + 1}. ${p.name}</b><br>
      Price: ${p.price} €<br>
      Rating: ${p.avg_rating} (${p.n_ratings} reviews)<br>
      <a href="${p.link}" target="_blank">Google Maps</a>
    `);
  });

  // QR code for linktree
  new QRCode(document.getElementById("qrcode"), window.location.href.replace("index.html", "linktree.html"));
}
