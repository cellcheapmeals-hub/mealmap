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
      name: cols[0] || "Unknown",
      lat: cols[1] ? parseFloat(cols[1]) : NaN,
      lng: cols[2] ? parseFloat(cols[2]) : NaN,
      price: cols[3] ? parseFloat(cols[3]) : NaN,
      link: cols[4] || "",
      avg_rating: cols[5] ? parseFloat(cols[5]) : 0,
      n_ratings: cols[6] ? parseInt(cols[6], 10) : 0
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
