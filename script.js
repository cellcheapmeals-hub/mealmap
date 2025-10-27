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

  // Grey/light map
  L.tileLayer('https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Walking circles
  L.circle([lab.lat, lab.lng], { radius: 400, color: 'blue', fillOpacity: 0.05 }).addTo(map);
  L.circle([lab.lat, lab.lng], { radius: 800, color: 'green', fillOpacity: 0.05 }).addTo(map);

  function getColor(rating) {
    if (rating >= 4) return "#2ECC71";
    if (rating >= 3) return "#F1C40F";
    return "#E74C3C";
  }

  const sorted = places.map(p => ({
    ...p,
    dist: map.distance([lab.lat, lab.lng], [p.lat, p.lng])
  })).sort((a, b) => a.dist - b.dist);

  const list = document.getElementById("places-list");

  sorted.forEach((p, i) => {
    // Marker
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 8,
      fillColor: getColor(p.avg_rating),
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`
      <b>${i + 1}. ${p.name}</b><br>
      Price: ${p.price} €<br>
      Rating: ${p.avg_rating} (${p.n_ratings} reviews)<br>
      <a href="${p.link}" target="_blank">Google Maps</a>
    `);

    // Legend entry
    const li = document.createElement("li");
    li.innerHTML = `<b>${i + 1}. ${p.name}</b> - <a href="${p.link}" target="_blank">Google Maps</a>`;
    li.style.color = getColor(p.avg_rating);
    list.appendChild(li);
  });

  // QR code
  new QRCode(document.getElementById("qrcode"), window.location.href.replace("index.html", "linktree.html"));
}
