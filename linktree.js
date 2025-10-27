const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPXZ6M20Zh0YZkq60NtJSYZ2rv3J-hravmeyeiaTOwtprq1EjrU4St0rQCXvYiUCNp5Sy47AMAoxEW/pub?gid=0&single=true&output=csv";

async function loadData() {
  const res = await fetch(sheetURL);
  const text = await res.text();
  const rows = text.trim().split("\n").map(r => r.split(","));
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

async function buildList() {
  const list = document.getElementById("list");
  const data = await loadData();

  // Sort alphabetically
  data.sort((a, b) => a.name.localeCompare(b.name));

  data.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${p.link}" target="_blank">${p.name}</a> – ${p.price} €`;
    list.appendChild(li);
  });
}

buildList();
