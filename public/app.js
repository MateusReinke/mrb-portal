let cardsData = [];
let currentTheme = localStorage.getItem("theme") || "dark";

if(currentTheme === "light"){
  document.body.classList.add("light");
}

function toggleTheme(){
  document.body.classList.toggle("light");
  const theme = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("theme", theme);
}

async function loadCards(){
  const res = await fetch('/cards');
  cardsData = await res.json();
  populateCategories();
  renderCards(cardsData);
}

function populateCategories(){
  const select = document.getElementById("categoryFilter");
  const categories = [...new Set(cardsData.map(c=>c.category))];

  select.innerHTML = `<option value="">Todas Categorias</option>`;
  categories.forEach(cat=>{
    select.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

function renderCards(data){
  const container = document.getElementById("cards");
  container.innerHTML = "";

  data.forEach(card=>{
    container.innerHTML += `
      <div class="card">
        <img src="${card.image}">
        <h3>${card.title}</h3>
        <p>${card.category}</p>
        <a href="${card.url}" target="_blank">
          <button>Acessar</button>
        </a>
      </div>
    `;
  });
}

document.getElementById("search").addEventListener("input", filterCards);
document.getElementById("categoryFilter").addEventListener("change", filterCards);

function filterCards(){
  const search = document.getElementById("search").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;

  let filtered = cardsData.filter(card=>{
    const matchSearch = card.title.toLowerCase().includes(search);
    const matchCategory = category ? card.category === category : true;
    return matchSearch && matchCategory;
  });

  renderCards(filtered);
}

loadCards();
