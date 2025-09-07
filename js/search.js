document.addEventListener('DOMContentLoaded', () => {
    const btnPesquisar = document.getElementById('btnPesquisar');
    const btnFecharPesquisa = document.getElementById('btnFecharPesquisa');
    const searchContainer = document.getElementById('searchContainer');
    const containerMenu = document.querySelector('.container-menu');
    const searchInput = document.getElementById('searchInput');

    btnPesquisar.addEventListener('click', () => {
        containerMenu.classList.add('searching');
        searchContainer.classList.remove('hidden');
        setTimeout(() => {
            searchContainer.classList.add('show');
            btnPesquisar.classList.add('hidden');
            searchInput.focus();
        }, 10);
    });

    btnFecharPesquisa.addEventListener('click', () => {
        searchContainer.classList.remove('show');
        setTimeout(() => {
            containerMenu.classList.remove('searching');
            searchContainer.classList.add('hidden');
            btnPesquisar.classList.remove('hidden');
            searchInput.value = '';
            mostrarTodosProdutos();
        }, 300);
    });

    // Função para filtrar produtos
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        filtrarProdutos(searchTerm);
    });
});

function filtrarProdutos(searchTerm) {
    const produtos = document.querySelectorAll('.item-cardapio');
    
    produtos.forEach(produto => {
        const nome = produto.querySelector('.name').textContent.toLowerCase();
        const descricao = produto.querySelector('.description').textContent.toLowerCase();
        
        if (nome.includes(searchTerm) || descricao.includes(searchTerm)) {
            produto.style.display = 'block';
            mostrarCategoriaDoProduto(produto);
        } else {
            produto.style.display = 'none';
        }
    });

   
    if (searchTerm === '') {
        mostrarTodosProdutos();
    }

    esconderCategoriasVazias();
}

function mostrarCategoriaDoProduto(produto) {
    const categoriaContainer = produto.closest('.container-group');
    if (categoriaContainer) {
        categoriaContainer.style.display = 'block';
    }
}

function esconderCategoriasVazias() {
    const categorias = document.querySelectorAll('.container-group');
    
    categorias.forEach(categoria => {
        const produtosVisiveis = categoria.querySelectorAll('.item-cardapio[style="display: block;"]').length;
        
        if (produtosVisiveis === 0) {
            categoria.style.display = 'none';
        } else {
            categoria.style.display = 'block';
        }
    });
}

function mostrarTodosProdutos() {
    document.querySelectorAll('.container-group').forEach(categoria => {
        categoria.style.display = 'block';
    });

    document.querySelectorAll('.item-cardapio').forEach(produto => {
        produto.style.display = 'block';
    });
}