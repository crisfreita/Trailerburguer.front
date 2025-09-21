async function carregarMesas() {
  let grid = document.getElementById("mesas");

  try {
    let res = await fetch("http://localhost:3000/mesas");
    let mesas = await res.json();

    grid.innerHTML = "";

    mesas.forEach((m) => {
      let div = document.createElement("div");
      div.className = "mesa " + (m.status === "livre" ? "livre" : "ocupada");
      div.innerText = "Mesa " + m.numero;

      div.onclick = () => {
        window.location.href = "pedido.html?mesa=" + m.id;
      };

      grid.appendChild(div);
    });
  } catch (err) {
    grid.innerHTML =
      "<p style='color:red;text-align:center'>Erro ao carregar mesas.</p>";
  }
}

carregarMesas();
setInterval(carregarMesas, 5000);
