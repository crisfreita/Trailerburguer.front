document.addEventListener("DOMContentLoaded", function () {
  garcom.event.init();
});

var garcom = {};
let PRODUTO = {}; // objeto do produto atual
let OPCIONAIS_SELECIONADOS = []; // array com opcionais escolhidos
let QUANTIDADE_SELECIONADA = 1; // quantidade atual

garcom.event = {
  init: () => {
    garcom.method.obterCategorias();
    garcom.method.obterCarrinhoMesa(); // opcional, se você quiser salvar itens por mesa
  },
};

garcom.method = {
  // 🔹 Buscar categorias
  obterCategorias: async () => {
    try {
      let res = await fetch("/categoria"); // 👈 relativo ao domínio atual
      let response = await res.json();

      if (response.status === "error") {
        alert(response.message);
        return;
      }

      garcom.method.carregarCategorias(response.data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  },

  // 🔹 Renderizar categorias dinamicamente
  carregarCategorias: (list) => {
    let container = document.querySelector("#listaCategorias");
    let listaItens = document.querySelector("#listaItensCardapio");
    container.innerHTML = "";
    listaItens.innerHTML = "";

    list.forEach((e, i) => {
      // botão da categoria no menu
      let btn = document.createElement("a");
      btn.className = "btn btn-white me-2 item-categoria";
      btn.id = `categoria-${e.idcategoria}`;
      if (i === 0) btn.classList.add("active");

      btn.innerHTML = `<i class="fas fa-utensils"></i> ${e.nome}`;
      btn.onclick = () => {
        document
          .querySelectorAll("#listaCategorias a")
          .forEach((el) => el.classList.remove("active"));
        btn.classList.add("active");

        document
          .getElementById(`categoria-header-${e.idcategoria}`)
          .scrollIntoView({ behavior: "smooth", block: "start" });
      };

      container.appendChild(btn);

      // bloco da categoria no cardápio
      let bloco = `
        <div class="container-group" id="categoria-header-${e.idcategoria}">
          <h3 class="nome-categoria">${e.nome}</h3>
          <div class="produtos-grid"></div>
        </div>
      `;
      listaItens.innerHTML += bloco;
    });

    // 🔹 Depois de criar categorias, buscar produtos
    garcom.method.obterProdutos();
  },

  // 🔹 Buscar todos os produtos
  obterProdutos: async () => {
    try {
      let res = await fetch("http://www.trailerburguer.com.br/produto");
      let response = await res.json();

      if (response.status === "error") {
        alert(response.message);
        return;
      }

      garcom.method.carregarProdutos(response.data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  },

  // 🔹 Renderizar produtos dentro de suas categorias
  carregarProdutos: (list) => {
    if (list.length > 0) {
      list.forEach((e) => {
        let temp = garcom.templates.produto
          .replace(/\${nome}/g, e.nome)
          .replace(/\${valor}/g, e.valor.toFixed(2).replace(".", ","))
          .replace(/\${descricao}/g, e.descricao || "");

        let grid = document.querySelector(
          `#categoria-header-${e.idcategoria} .produtos-grid`
        );
        if (grid) grid.innerHTML += temp;
      });
    }

    // Evento para abrir modal com detalhes
    document.querySelectorAll(".card-item").forEach((card) => {
      card.addEventListener("click", () => {
        document.getElementById("modalNome").textContent = card.dataset.nome;
        document.getElementById("modalPreco").textContent =
          "R$ " + parseFloat(card.dataset.preco).toFixed(2).replace(".", ",");
        document.getElementById("modalDescricao").textContent =
          card.dataset.descricao;

        document.getElementById("produtoModal").style.display = "flex";
      });
    });
  },

  validarCategoriaScroll: () => {
    const categorias = document.querySelectorAll(".categoria-bloco");

    categorias.forEach((categoria) => {
      let elementId = categoria.getAttribute("id"); // ex: categoria-header-1
      if (!elementId) return;

      let docViewTop = window.scrollY;
      let elemTop = categoria.offsetTop;
      let top = (elemTop - (docViewTop + 120)) * -1; // 120 = header fixo
      let id = elementId.split("categoria-header-")[1];

      if (top > 0) {
        document
          .querySelectorAll("#listaCategorias a")
          .forEach((el) => el.classList.remove("active"));

        let btn = document.querySelector(`#categoria-${id}`);
        if (btn) btn.classList.add("active");
      }
    });
  },

  selecionarCategoria: (id) => {
    document
      .querySelectorAll("#listaCategorias a")
      .forEach((el) => el.classList.remove("active"));

    let btn = document.querySelector(`#categoria-${id}`);
    if (btn) btn.classList.add("active");

    let alvo = document.querySelector(`#categoria-header-${id}`);
    if (alvo) {
      window.scrollTo({
        top: alvo.offsetTop - 100,
        behavior: "smooth",
      });
    }
  },

  // Atualiza o valor total do produto (base + opcionais * qtd)
  atualizarSacola: () => {
    let valorTotal = PRODUTO.valor;

    for (let index = 0; index < OPCIONAIS_SELECIONADOS.length; index++) {
      const element = OPCIONAIS_SELECIONADOS[index];
      if (element.valoropcional > 0) {
        valorTotal += element.valoropcional;
      }
    }

    valorTotal = QUANTIDADE_SELECIONADA * valorTotal;

    document.getElementById("btn-preco-produto").innerText = `R$ ${valorTotal
      .toFixed(2)
      .replace(".", ",")}`;
  },

  // Diminuir quantidade
  diminuirQuantidade: () => {
    if (QUANTIDADE_SELECIONADA === 1) return;

    QUANTIDADE_SELECIONADA--;
    document.querySelector("#qntd-carrinho").innerText = QUANTIDADE_SELECIONADA;
    item.method.atualizarSacola();
  },

  // Aumentar quantidade
  aumentarQuantidade: () => {
    QUANTIDADE_SELECIONADA++;
    document.querySelector("#qntd-carrinho").innerText = QUANTIDADE_SELECIONADA;
    item.method.atualizarSacola();
  },

  // Quando abrir modal, resetar quantidade e opcionais
  abrirProduto: (produto) => {
    PRODUTO = produto;
    QUANTIDADE_SELECIONADA = 1;
    OPCIONAIS_SELECIONADOS = [];

    // Atualizar modal
    document.getElementById("modalNome").textContent = produto.nome;
    document.getElementById("modalPreco").textContent = `R$ ${produto.valor
      .toFixed(2)
      .replace(".", ",")}`;
    document.getElementById("modalDescricao").textContent =
      produto.descricao || "";
    document.getElementById("qntd-carrinho").innerText = "1";

    // Atualiza valor inicial no botão
    item.method.atualizarSacola();

    // Exibe modal
    document.getElementById("produtoModal").style.display = "flex";
  },
};

// Inicia carregando categorias
document.addEventListener("DOMContentLoaded", garcom.method.obterCategorias);

garcom.templates = {
  categoria: `
    <a href="#!" id="categoria-\${idcategoria}" 
       class="item-categoria btn btn-white btn-sm mb-3 me-3 \${active}" 
       onclick="garcom.method.selecionarCategoria('\${idcategoria}')">
        <i class="fas fa-utensils"></i> \${nome}
    </a>
  `,

  headerCategoria: `
    <div class="container-group mb-4" id="categoria-header-\${idcategoria}">
      <p class="title-categoria"><b>\${nome}</b></p>
      <div class="produtos-grid"></div>
    </div>
  `,

  produto: `
    <div class="card-item" 
         data-nome="\${nome}" 
         data-preco="\${valor}" 
         data-descricao="\${descricao}">
      <div class="info-produto">
        <h3 class="title-produto">\${nome}</h3>
        <span class="price-produto">R$ \${valor}</span>
      </div>
    </div>
  `,
};
