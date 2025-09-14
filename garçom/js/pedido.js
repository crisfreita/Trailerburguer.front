// pega o id da mesa da URL (ex: pedido.html?mesa=5)
const urlParams = new URLSearchParams(window.location.search);
const mesaId = urlParams.get("mesa");

// mostra no título
document.getElementById("tituloMesa").innerText = "Pedido da Mesa " + mesaId;

// exemplo de carregamento de categorias/produtos
async function carregarProdutos() {
  // aqui você pode chamar sua API que já retorna o cardápio
  let res = await fetch("http://localhost:3000/produtos");
  let produtos = await res.json();

  let lista = document.getElementById("listaItensCardapio");
  lista.innerHTML = "";

  produtos.forEach((p) => {
    let div = document.createElement("div");
    div.className = "card m-2 p-2";
    div.innerHTML = `
      <h5>${p.nome}</h5>
      <p>R$ ${p.preco.toFixed(2)}</p>
      <button class="btn btn-primary" onclick="adicionarItem(${p.id}, '${
      p.nome
    }', ${p.preco})">Adicionar</button>
    `;
    lista.appendChild(div);
  });
}

// carrinho temporário da mesa
let carrinho = [];

function adicionarItem(id, nome, preco) {
  carrinho.push({ id, nome, preco });
  document.getElementById("qtdItensMesa").innerText =
    carrinho.length + " itens";
}

function enviarPedidoMesa() {
  fetch("http://localhost:3000/pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mesa: mesaId,
      itens: carrinho,
    }),
  })
    .then((res) => res.json())
    .then(() => {
      alert("Pedido enviado para a cozinha!");
      carrinho = [];
      document.getElementById("qtdItensMesa").innerText = "0 itens";
    });
}

// inicia carregando cardápio
carregarProdutos();
