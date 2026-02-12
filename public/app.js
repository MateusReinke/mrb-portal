async function loadCards(){
  const res = await fetch('/cards');
  const data = await res.json();

  const container = document.getElementById('cards');
  container.innerHTML = "";

  data.forEach(card=>{
    container.innerHTML += `
      <div class="card">
        <img src="${card.image}">
        <h3>${card.title}</h3>
        <p>${card.category}</p>
        <a href="${card.url}" target="_blank">Acessar</a>
      </div>
    `;
  });
}

loadCards();
