const sheetURL = "https://docs.google.com/spreadsheets/d/e/PASTE-YOUR-LINK-HERE/pub?output=csv";

async function loadData() {
  const res = await fetch(sheetURL);
  const text = await res.text();
  const rows = text.trim().split("\n").map(r => r.split(","));
  const [header, ...data] = rows;

  return data.map(r => ({
    name: r[0],
    lat: parseFloat(r[1]),
    lng: parseFloat(r[2]),
    price: parseFloat(r[3]),
    link: r[4]
  }));
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
