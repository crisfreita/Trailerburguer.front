document.addEventListener("DOMContentLoaded", function (event) {
  carrinho.event.init();
});

var carrinho = {};

var CARRINHO_ATUAL = [];
var PRODUTO_SELECIONADO = "";
var TEMPO_DEFAULT = "";
var TAXAS_ENTREGA = [];
var TAXA_ATUAL = 0;
var TAXA_ATUAL_ID = null;

var FORMAS_PAGAMENTO = [];
var FORMA_SELECIONADA = null;
var TROCO = 0;

var MODAL_ENDERECO = new bootstrap.Modal(
  document.getElementById("modalEndereco")
);

carrinho.event = {
  init: () => {
    $(".cep").mask("00000-000");

    var SPMaskBehavior = function (val) {
        return val.replace(/\D/g, "").length === 11
          ? "(00) 00000-0000"
          : "(00) 0000-00009";
      },
      spOptions = {
        onKeyPress: function (val, e, field, options) {
          field.mask(SPMaskBehavior.apply({}, arguments), options);
        },
      };

    $(".sp_celphones").mask(SPMaskBehavior, spOptions);

    carrinho.method.obterCarrinho();
    carrinho.method.obterTiposEntrega();
    carrinho.method.obterTaxaEntrega();
    carrinho.method.obterEndereco();
    carrinho.method.obterFormasPagamento();
  },
};

carrinho.method = {
  // ------ ITENS DO CARRINHO ------

  // carrega o carrinho
  obterCarrinho: () => {
    CARRINHO_ATUAL = [];

    let carrinhoLocal = app.method.obterValorSessao("cart");

    if (carrinhoLocal != undefined) {
      let cart = JSON.parse(carrinhoLocal);

      CARRINHO_ATUAL = cart.itens;

      if (cart.itens.length > 0) {
        // exibe o carrinho
        document.querySelector("#carrinho-vazio").classList.add("hidden");
        document.querySelector("#carrinho-cheio").classList.remove("hidden");
        document.querySelector("#opcoes-entrega").classList.remove("hidden");
        document.querySelector("#btnFazerPedido").classList.remove("hidden");
        document.querySelector("#btnVoltar").classList.add("hidden");

        carrinho.method.carregarProdutosCarrinho(cart.itens);
      } else {
        document.querySelector("#carrinho-vazio").classList.remove("hidden");
        document.querySelector("#carrinho-cheio").classList.add("hidden");
        document.querySelector("#opcoes-entrega").classList.add("hidden");
        document.querySelector("#btnFazerPedido").classList.add("hidden");
        document.querySelector("#btnVoltar").classList.remove("hidden");
      }
    } else {
      document.querySelector("#carrinho-vazio").classList.remove("hidden");
      document.querySelector("#carrinho-cheio").classList.add("hidden");
      document.querySelector("#opcoes-entrega").classList.add("hidden");
      document.querySelector("#btnFazerPedido").classList.add("hidden");
      document.querySelector("#btnVoltar").classList.remove("hidden");
    }
  },

  // carrega os produtos na tela
  carregarProdutosCarrinho: (list) => {
    document.querySelector("#listaProdutos").innerHTML = "";

    if (list.length > 0) {
      list.forEach((e, i) => {
        let itens = "";

        if (e.opcionais.length > 0) {
          // monta a lista de opcionais

          for (let index = 0; index < e.opcionais.length; index++) {
            let element = e.opcionais[index];

            itens += carrinho.template.opcional
              .replace(/\${nome}/g, `${e.quantidade}x ${element.nomeopcional}`)
              .replace(
                /\${preco}/g,
                `+ R$ ${(e.quantidade * element.valoropcional)
                  .toFixed(2)
                  .replace(".", ",")}`
              );
          }
        }

        let obs = "";

        if (e.observacao.length > 0) {
          obs = carrinho.template.obs.replace(/\${observacao}/g, e.observacao);
        }

        let temp = carrinho.template.produto
          .replace(/\${guid}/g, e.guid)
          .replace(/\${nome}/g, `${e.quantidade}x ${e.nome}`)
          .replace(
            /\${preco}/g,
            `R$ ${(e.quantidade * e.valor).toFixed(2).replace(".", ",")}`
          )
          .replace(/\${obs}/g, obs)
          .replace(/\${opcionais}/g, itens);

        document.querySelector("#listaProdutos").innerHTML += temp;
      });

      carrinho.method.atualizarValorTotal();
    }
  },

  // atualiza o valor total do carrinho
  atualizarValorTotal: () => {
    if (CARRINHO_ATUAL.length > 0) {
      let total = 0;

      CARRINHO_ATUAL.forEach((e, i) => {
        let subTotal = 0;

        if (e.opcionais.length > 0) {
          // percorre a lista de opcionais
          for (let index = 0; index < e.opcionais.length; index++) {
            let element = e.opcionais[index];
            subTotal += element.valoropcional * e.quantidade;
          }
        }

        subTotal += e.quantidade * e.valor;
        total += subTotal;
      });

      // validar taxa entrega
      if (TAXA_ATUAL > 0) {
        total += TAXA_ATUAL;

        // exibe o label da taxa
        document
          .querySelector("#containerTaxaEntrega")
          .classList.remove("hidden");
        document.querySelector(
          "#lblTaxaEntrega"
        ).innerText = `+ R$ ${TAXA_ATUAL.toFixed(2).replace(".", ",")}`;
      } else {
        document.querySelector("#containerTaxaEntrega").classList.add("hidden");
        document.querySelector("#lblTaxaEntrega").innerText = "-";
      }

      document.querySelector("#lblTotalCarrinho").innerText = `R$ ${total
        .toFixed(2)
        .replace(".", ",")}`;
      document.querySelector("#lblTotalCarrinhoBotao").innerText = `R$ ${total
        .toFixed(2)
        .replace(".", ",")}`;
    }
  },

  // abre a modal para "editar" ou "remover" o produto
  abrirModalOpcoesProduto: (guid) => {
    PRODUTO_SELECIONADO = guid;
    document.querySelector("#modalActionsProduto").classList.remove("hidden");
  },

  // fecha a modal de actions do produto
  fecharModalActionsProduto: () => {
    PRODUTO_SELECIONADO = "";
    document.querySelector("#modalActionsProduto").classList.add("hidden");
  },

  // edita o produto do carrinho
  editarProdutoCarrinho: () => {
    if (PRODUTO_SELECIONADO.length > 0) {
      let carrinhoLocal = app.method.obterValorSessao("cart");

      if (carrinhoLocal != undefined) {
        let cart = JSON.parse(carrinhoLocal);

        if (cart.itens.length > 0) {
          // Localiza o produto no carrinho pelo guid
          let produto = cart.itens.find((e) => {
            return e.guid != PRODUTO_SELECIONADO;
          });

          if (produto) {
            // Se a nova quantidade for 0, remove o produto
            if (novaQuantidade <= 0) {
              cart.itens = cart.itens.filter((e) => {
                return e.guid != PRODUTO_SELECIONADO;
              });
              app.method.mensagem("Item removido.", "green");
            } else {
              // Atualiza a quantidade do produto
              produto.quantidade = novaQuantidade;
              app.method.mensagem("Quantidade atualizada.", "green");
            }

            // Salva o novo carrinho
            app.method.gravarValorSessao(JSON.stringify(cart), "cart");

            // Recarrega o carrinho
            carrinho.method.obterCarrinho();

            // Reseta a seleção de produto
            document
              .querySelector("#modalActionsProduto")
              .classList.add("hidden");
          } else {
            app.method.mensagem("Produto não encontrado no carrinho.", "red");
          }
        }
      } else {
        app.method.mensagem("Carrinho vazio.", "red");
      }
    } else {
      app.method.mensagem("Nenhum produto selecionado.", "red");
    }
  },

  // remove o produto do carrinho
  removerProdutoCarrinho: () => {
    if (PRODUTO_SELECIONADO.length > 0) {
      let carrinhoLocal = app.method.obterValorSessao("cart");

      if (carrinhoLocal != undefined) {
        let cart = JSON.parse(carrinhoLocal);

        if (cart.itens.length > 0) {
          let outros = cart.itens.filter((e) => {
            return e.guid != PRODUTO_SELECIONADO;
          });
          cart.itens = outros;

          // salva o novo carrinho
          app.method.gravarValorSessao(JSON.stringify(cart), "cart");

          // carrega o carrinho novamente
          carrinho.method.obterCarrinho();

          PRODUTO_SELECIONADO = "";
          document
            .querySelector("#modalActionsProduto")
            .classList.add("hidden");

          app.method.mensagem("Item removido.", "green");
        }
      }
    }
  },

  // -------------------------------

  // ------ TIPO DE ENTREGA - DELIVERY OU RETIRADA ------

  obterTiposEntrega: () => {
    app.method.get(
      "/entrega/tipo",
      (response) => {
        console.log(response);

        if (response.status == "error") {
          app.method.mensagem(response.message);
          return;
        }

        let delivery = response.data.filter((e) => {
          return e.idtipoentrega == 1;
        });
        let retirada = response.data.filter((e) => {
          return e.idtipoentrega == 2;
        });

        // valida se o delivery (entrega) está ativo
        if (delivery[0].ativo) {
          let tempo = "";

          if (
            (delivery[0].tempominimo != null) & (delivery[0].tempominimo > 0) &&
            (delivery[0].tempomaximo != null) & (delivery[0].tempomaximo > 0)
          ) {
            tempo = `(${delivery[0].tempominimo}-${delivery[0].tempomaximo}min)`;
          }

          TEMPO_DEFAULT = tempo;
          document
            .querySelector("#containerTipoEntrega")
            .classList.remove("hidden");
        }

        // valida se a Retirada está ativa
        if (retirada[0].ativo) {
          let tempo = "";

          if (
            (retirada[0].tempominimo != null) & (retirada[0].tempominimo > 0) &&
            (retirada[0].tempomaximo != null) & (retirada[0].tempomaximo > 0)
          ) {
            tempo = `(${retirada[0].tempominimo}-${retirada[0].tempomaximo}min)`;
          }

          document.querySelector(
            "#lblTipoRetiradaTempo"
          ).innerText = `Retirada ${tempo}`;
          document
            .querySelector("#containerTipoRetirada")
            .classList.remove("hidden");
        }
      },
      (error) => {
        console.log("error", error);
      },
      true
    );
  },

  // botão de tipo entrega clicado
  changeTipoEntrega: () => {
    let check = document.querySelector("#chkEntrega").checked;

    if (check) {
      // exibe o container de endereco
      document
        .querySelector("#containerEnderecoEntrega")
        .classList.remove("hidden");

      // remove o check do outro tipo (retirada)
      document.querySelector("#chkRetirada").checked = false;

      carrinho.method.validarEnderecoSelecionado();
    } else {
      // remove o container de endereco
      document
        .querySelector("#containerEnderecoEntrega")
        .classList.add("hidden");

      document.querySelector("#containerTaxaEntrega").classList.add("hidden");

      TAXA_ATUAL = 0;
      TAXA_ATUAL_ID = null;

      carrinho.method.atualizarValorTotal();
    }
  },

  // botão de tipo retirada clicado
  changeTipoRetirada: () => {
    let check = document.querySelector("#chkRetirada").checked;

    if (check) {
      // remove o container de endereco
      document
        .querySelector("#containerEnderecoEntrega")
        .classList.add("hidden");

      // remove o check do outro tipo (entrega)
      document.querySelector("#chkEntrega").checked = false;

      carrinho.method.validarEnderecoSelecionado();

      document.querySelector("#containerTaxaEntrega").classList.add("hidden");
    }

    TAXA_ATUAL = 0;
    TAXA_ATUAL_ID = null;

    carrinho.method.atualizarValorTotal();
  },

  // obtem as taxas de entrega definidas
  obterTaxaEntrega: () => {
    app.method.get(
      "/entrega/taxa",
      (response) => {
        console.log(response);

        if (response.status == "error") {
          app.method.mensagem(response.message);
          return;
        }

        TAXAS_ENTREGA = response.data;
      },
      (error) => {
        console.log("error", error);
      },
      true
    );
  },

  // valida se tem endereco selecionado para exibir a taxa de entrega
  validarEnderecoSelecionado: () => {
    if (TAXAS_ENTREGA.length == 0) {
      document.querySelector("#containerTaxaEntrega").classList.add("hidden");
      return;
    }

    // Taxa Única
    if (TAXAS_ENTREGA[0].idtaxaentregatipo == 1) {
      TAXA_ATUAL = TAXAS_ENTREGA[0].valor;
      TAXA_ATUAL_ID = TAXAS_ENTREGA[0].idtaxaentrega;

      let tempo = "";

      if (
        (TAXAS_ENTREGA[0].tempominimo != null) &
          (TAXAS_ENTREGA[0].tempominimo > 0) &&
        (TAXAS_ENTREGA[0].tempomaximo != null) &
          (TAXAS_ENTREGA[0].tempomaximo > 0)
      ) {
        tempo = `(${TAXAS_ENTREGA[0].tempominimo}-${TAXAS_ENTREGA[0].tempomaximo}min)`;
      } else {
        tempo = TEMPO_DEFAULT;
      }

      document.querySelector(
        "#lblTipoEntregaTempo"
      ).innerText = `Entrega ${tempo}`;
    }

    // Taxa por Distância
    if (TAXAS_ENTREGA[0].idtaxaentregatipo == 2) {
      // valida se é a Retirada que está checada
      let retirada = document.querySelector("#chkRetirada").checked;

      if (retirada) {
        return;
      }

      // obtem o endereco selecionado do localstorage
      let enderecoAtual = app.method.obterValorSessao("address");

      if (enderecoAtual != undefined) {
        let endereco = JSON.parse(enderecoAtual);

        // otem a diferenca da distancia entre a loja e o endereco selecionado
        let dados = {
          endereco: `${endereco.endereco}, ${endereco.numero}, ${endereco.bairro}, ${endereco.cidade}-${endereco.estado}, ${endereco.cep}`,
        };

        app.method.loading(true);

        app.method.post(
          "/pedido/taxa",
          JSON.stringify(dados),
          (response) => {
            console.log("response", response);
            app.method.loading(false);

            if (response.status === "error") {
              app.method.mensagem(response.message);
              return;
            }

            TAXA_ATUAL = response.taxa;
            TAXA_ATUAL_ID = response.idtaxa;

            carrinho.method.atualizarValorTotal();

            // seta o tempo minimo e maximo da entrega
            let filtro_taxa = TAXAS_ENTREGA.filter((e) => {
              return e.idtaxaentrega == TAXA_ATUAL_ID;
            });

            if (filtro_taxa.length > 0) {
              let tempo = "";

              if (
                (filtro_taxa[0].tempominimo != null) &
                  (filtro_taxa[0].tempominimo > 0) &&
                (filtro_taxa[0].tempomaximo != null) &
                  (filtro_taxa[0].tempomaximo > 0)
              ) {
                tempo = `(${filtro_taxa[0].tempominimo}-${filtro_taxa[0].tempomaximo}min)`;
              } else {
                tempo = TEMPO_DEFAULT;
              }

              document.querySelector(
                "#lblTipoEntregaTempo"
              ).innerText = `Entrega ${tempo}`;
            }
          },
          (error) => {
            console.log("error", error);
            app.method.loading(false);
          },
          true
        );
      } else {
        TAXA_ATUAL = 0;
        TAXA_ATUAL_ID = null;
      }
    }

    // Sem taxa
    if (TAXAS_ENTREGA[0].idtaxaentregatipo == 3) {
      TAXA_ATUAL = 0;

      // seta o tempo minimo e máximo default
      document.querySelector(
        "#lblTipoEntregaTempo"
      ).innerText = `Entrega ${TEMPO_DEFAULT}`;
    }

    carrinho.method.atualizarValorTotal();
  },

  // -------------------------------

  // ------ ENDEREÇO ------

  // obtem o endereço selecionado do localstorage
  obterEndereco: () => {
    let enderecoAtual = app.method.obterValorSessao("address");

    if (enderecoAtual != undefined) {
      let endereco = JSON.parse(enderecoAtual);

      document.querySelector("#lblEnderecoSelecionado").innerText = `${
        endereco.endereco
      }, ${endereco.numero}, ${endereco.bairro} ${
        endereco.complemento ? ` - ${endereco.complemento}` : ""
      }`;
      document.querySelector(
        "#lblCepEnderecoSelecionado"
      ).innerText = `${endereco.cidade}-${endereco.estado} / ${endereco.cep}`;

      document.querySelector("#cardAddEndereco").classList.add("hidden");
      document
        .querySelector("#cardEnderecoSelecionado")
        .classList.remove("hidden");
    } else {
      document.querySelector("#cardAddEndereco").classList.remove("hidden");
      document
        .querySelector("#cardEnderecoSelecionado")
        .classList.add("hidden");
    }
  },

  // abre a modal para informar um endereço
  abrirModalEndereco: () => {
    MODAL_ENDERECO.show();
  },

  // salva o endereço no localstorage
  salvarEndereco: () => {
    // validação dos campos
    let cep = document.getElementById("txtCEP").value.trim();
    let endereco = document.getElementById("txtEndereco").value.trim();
    let bairro = document.getElementById("txtBairro").value.trim();
    let numero = document.getElementById("txtNumero").value.trim();
    let cidade = document.getElementById("txtCidade").value.trim();
    let complemento = document.getElementById("txtComplemento").value.trim();
    let uf = document.getElementById("ddlUf").value.trim();

    if (endereco.length <= 0) {
      app.method.mensagem("Informe o Endereço, por favor.");
      document.getElementById("txtEndereco").focus();
      return;
    }

    if (bairro.length <= 0) {
      app.method.mensagem("Informe o Bairro, por favor.");
      document.getElementById("txtBairro").focus();
      return;
    }

    if (cidade.length <= 0) {
      app.method.mensagem("Informe a Cidade, por favor.");
      document.getElementById("txtCidade").focus();
      return;
    }

    if (numero.length <= 0) {
      app.method.mensagem("Informe o Número, por favor.");
      document.getElementById("txtNumero").focus();
      return;
    }

    if (uf == "-1") {
      app.method.mensagem("Informe a UF, por favor.");
      document.getElementById("ddlUf").focus();
      return;
    }

    let dados = {
      cep: cep,
      endereco: endereco,
      bairro: bairro,
      cidade: cidade,
      estado: uf,
      numero: numero,
      complemento: complemento,
    };

    // salva no localstorage
    app.method.gravarValorSessao(JSON.stringify(dados), "address");

    carrinho.method.obterEndereco();
    carrinho.method.validarEnderecoSelecionado();
    MODAL_ENDERECO.hide();
  },

  buscarPorEndereco: () => {
    let rua = document.querySelector("#txtEndereco").value;
    let bairro = document.querySelector("#txtBairro").value;
    let cidade = document.querySelector("#txtCidade").value;

    if (!rua || !bairro || !cidade) {
      app.method.mensagem("Preencha rua, bairro e cidade.");
      return;
    }

    // Monta a query para o Google Maps
    let enderecoQuery = encodeURIComponent(
      `${rua}, ${bairro}, ${cidade}, Brasil`
    );
    let apiKey = "AIzaSyBeqAHQL5djcTkZgtJuCa24jJSnkTiDby8"; // coloque sua chave

    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${enderecoQuery}&key=${apiKey}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "OK" && data.results.length > 0) {
          let resultado = data.results[0];
          let endereco = resultado.formatted_address;
          let localizacao = resultado.geometry.location;

          console.log("Endereço encontrado:", endereco);
          console.log(
            "Latitude:",
            localizacao.lat,
            "Longitude:",
            localizacao.lng
          );

          // Aqui você pode salvar usando seu método
          app.method.gravarValorSessao("address", endereco);
        } else {
          app.method.mensagem("Endereço não encontrado.");
        }
      })
      .catch((error) => {
        console.error("Erro ao buscar endereço:", error);
        app.method.mensagem("Erro na busca do endereço.");
      });
  },

  buscarEnderecoGoogle: () => {
    const rua = document.getElementById("txtEndereco").value.trim();
    const cidade = document.getElementById("txtCidade").value.trim();
    const estado = document.getElementById("ddlUf").value.trim();

    if (rua !== "") {
      const query = `${rua}, ${cidade}, ${estado}`;
      const apiKey = "AIzaSyBeqAHQL5djcTkZgtJuCa24jJSnkTiDby8"; // troque pela sua chave real
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${apiKey}`;

      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "OK" && data.results.length > 0) {
            const result = data.results[0];
            const address = result.address_components;

            // Preencher os campos com base nos componentes
            address.forEach((component) => {
              if (component.types.includes("route")) {
                document.getElementById("txtEndereco").value =
                  component.long_name;
              }
              if (
                component.types.includes("sublocality") ||
                component.types.includes("neighborhood")
              ) {
                document.getElementById("txtBairro").value =
                  component.long_name;
              }
              if (component.types.includes("locality")) {
                document.getElementById("txtCidade").value =
                  component.long_name;
              }
              if (component.types.includes("administrative_area_level_1")) {
                document.getElementById("ddlUf").value = component.short_name;
              }
            });

            // Coordenadas (se precisar)
            document.getElementById("txtLatitude").value =
              result.geometry.location.lat;
            document.getElementById("txtLongitude").value =
              result.geometry.location.lng;

            document.getElementById("txtNumero").focus();
          } else {
            app.method.mensagem("Endereço não encontrado.");
          }
        })
        .catch((err) => {
          console.error(err);
          app.method.mensagem("Erro ao buscar o endereço.");
        });
    } else {
      app.method.mensagem("Digite o nome da rua.");
      document.getElementById("txtEndereco").focus();
    }
  },

  // API ViaCEP
  buscarCep: () => {
    // cria a variavel com o valor do cep
    var cep = document.getElementById("txtCEP").value.trim().replace(/\D/g, "");

    if (cep != "") {
      // Expressão regular para validar o CEP
      var validacep = /^[0-9]{8}$/;

      // Valida o formato do CEP.
      if (validacep.test(cep)) {
        // cria um elemento javascript
        var script = document.createElement("script");

        // sincroniza com o callback
        script.src =
          "https://viacep.com.br/ws/" +
          cep +
          "/json/?callback=carrinho.method.callbackCep";

        //Insere script no documento e carrega o conteúdo.
        document.body.appendChild(script);
      } else {
        app.method.mensagem("Formato do CEP inválido.");
        document.getElementById("txtCEP").focus();
      }
    } else {
      app.method.mensagem("Informe o CEP, por favor.");
      document.getElementById("txtCEP").focus();
    }
  },

  // método chamado quando retorna algo da API de CEP
  callbackCep: (dados) => {
    if (!("erro" in dados)) {
      // Atualiza os campos com os valores retornados
      document.getElementById("txtEndereco").value = dados.logradouro;
      document.getElementById("txtBairro").value = dados.bairro;
      document.getElementById("txtCidade").value = dados.localidade;
      document.getElementById("ddlUf").value = dados.uf;
      document.getElementById("txtNumero").focus();
    } else {
      app.method.mensagem(
        "CEP não encontrado. Preencha as informações manualmente."
      );
      document.getElementById("txtEndereco").focus();
    }
  },

  // abre a modal para 'editar' ou 'remover' o endereco
  abrirModalOpcoesEndereco: () => {
    document.querySelector("#modalActionsEndereco").classList.remove("hidden");
  },

  // fecha a modal de actions do endereço
  fecharModalActionsEndereco: () => {
    document.querySelector("#modalActionsEndereco").classList.add("hidden");
  },

  // edita o endereço do carrinho
  editarEnderecoCarrinho: () => {
    let enderecoAtual = app.method.obterValorSessao("address");

    if (enderecoAtual != undefined) {
      let endereco = JSON.parse(enderecoAtual);

      document.getElementById("txtCEP").value = endereco.cep;
      document.getElementById("txtEndereco").value = endereco.endereco;
      document.getElementById("txtBairro").value = endereco.bairro;
      document.getElementById("txtNumero").value = endereco.numero;
      document.getElementById("txtCidade").value = endereco.cidade;
      document.getElementById("ddlUf").value = endereco.estado;
      document.getElementById("txtComplemento").value = endereco.complemento;

      document.querySelector("#modalActionsEndereco").classList.add("hidden");
      MODAL_ENDERECO.show();
    }
  },

  // remove o endereço do carrinho
  removerEnderecoCarrinho: () => {
    localStorage.removeItem("address");

    carrinho.method.obterEndereco();
    carrinho.method.validarEnderecoSelecionado();

    document.querySelector("#modalActionsEndereco").classList.add("hidden");
  },

  // -------------------------------

  // ------ FORMAS DE PAGAMENTO ------

  obterFormasPagamento: () => {
    app.method.get(
      "/formapagamento",
      (response) => {
        console.log(response);

        if (response.status == "error") {
          app.method.mensagem(response.message);
          return;
        }

        FORMAS_PAGAMENTO = response.data;

        carrinho.method.carregarFormasPagamento(response.data);
      },
      (error) => {
        console.log("error", error);
      },
      true
    );
  },

  // carrega as formas de pagamento na tela
  carregarFormasPagamento: (list) => {
    if (list.length > 0) {
      list.forEach((e, i) => {
        let temp = `<a href="#!" onclick="carrinho.method.selecionarFormaPagamento('${e.idformapagamento}')">${e.nome}</a>`;

        document.querySelector(
          "#modalActionsFormaPagamento .container-modal-actions"
        ).innerHTML += temp;

        // útlimo item
        if (i + 1 == list.length) {
          document.querySelector(
            "#modalActionsFormaPagamento .container-modal-actions"
          ).innerHTML += `<a href="#!" class="color-red" onclick="carrinho.method.selecionarFormaPagamento('')">Remover</a>`;
        }
      });
    } else {
      document.querySelector("#formasPagamento").remove();
    }
  },

  // método que seleciona a forma de pagamento
  selecionarFormaPagamento: (forma) => {
    let selecionada = FORMAS_PAGAMENTO.filter((e) => {
      return e.idformapagamento == forma;
    });

    TROCO = 0;

    if (selecionada.length > 0) {
      FORMA_SELECIONADA = selecionada[0];

      document
        .querySelector("#cardFormaPagamentoSelecionada")
        .classList.remove("hidden");
      document.querySelector("#cardAddFormaPagamento").classList.add("hidden");

      document.querySelector("#lblFormaPagamentoSelecionada").innerText =
        FORMA_SELECIONADA.nome;

      // se for Pix
      if (FORMA_SELECIONADA.idformapagamento == 1) {
        document.querySelector(
          "#lblDescFormaPagamentoSelecionada"
        ).innerText = `Pagamento na entrega do pedido.`;
        document.querySelector(
          "#iconFormaPagamentoSelecionada"
        ).innerHTML = `<i class="fas fa-receipt"></i>`;
      }
      // se for dinheiro
      else if (FORMA_SELECIONADA.idformapagamento == 2) {
        let troco = prompt("Qual o valor do troco?");
        if (troco != null) {
          // valida se o troco está correto
          let _teste = parseFloat(troco);

          if (isNaN(_teste) || troco.trim() == "" || _teste <= 1) {
            TROCO = 0;
            document.querySelector(
              "#lblDescFormaPagamentoSelecionada"
            ).innerText = `Pagamento na entrega do pedido.`;
          } else {
            TROCO = _teste;
            document.querySelector(
              "#lblDescFormaPagamentoSelecionada"
            ).innerText = `Troco para: ${_teste
              .toFixed(2)
              .replace(".", ",")} reais.`;
          }
        } else {
          document.querySelector(
            "#lblDescFormaPagamentoSelecionada"
          ).innerText = `Pagamento na entrega do pedido.`;
        }

        document.querySelector(
          "#iconFormaPagamentoSelecionada"
        ).innerHTML = `<i class="fas fa-coins"></i>`;
      }
      // se for cartão
      else {
        document.querySelector(
          "#lblDescFormaPagamentoSelecionada"
        ).innerText = `Pagamento na entrega do pedido.`;
        document.querySelector(
          "#iconFormaPagamentoSelecionada"
        ).innerHTML = `<i class="fas fa-credit-card"></i>`;
      }
    } else {
      document
        .querySelector("#cardFormaPagamentoSelecionada")
        .classList.add("hidden");
      document
        .querySelector("#cardAddFormaPagamento")
        .classList.remove("hidden");

      FORMA_SELECIONADA = null;
    }

    carrinho.method.fecharModalActionsFormaPagamento();
  },

  // abre a modal para 'editar' ou 'remover' a forma de pagamento
  abrirModalFormaPagamento: () => {
    document
      .querySelector("#modalActionsFormaPagamento")
      .classList.remove("hidden");
  },

  // fecha a modal de actions das formas de pagamento
  fecharModalActionsFormaPagamento: () => {
    document
      .querySelector("#modalActionsFormaPagamento")
      .classList.add("hidden");
  },

  // -------------------------------

  // ------ REALIZAR PEDIDO ------

  // botão de realizar o pedido
  fazerPedido: () => {
    if (CARRINHO_ATUAL.length === 0) {
      app.method.mensagem("Nenhum item no carrinho.");
      return;
    }

    let checkEntrega = document.querySelector("#chkEntrega").checked;
    let checkRetirada = document.querySelector("#chkRetirada").checked;

    if (!checkEntrega && !checkRetirada) {
      app.method.mensagem("Selecione entrega ou retirada.");
      return;
    }

    let enderecoAtual = app.method.obterValorSessao("address");
    if (checkEntrega && !enderecoAtual) {
      app.method.mensagem("Informe o endereço de entrega.");
      return;
    }

    let enderecoSelecionado = enderecoAtual ? JSON.parse(enderecoAtual) : null;

    let nome = $("#txtNomeSobrenome").val().trim();
    let celular = $("#txtCelular").val().trim();

    if (nome.length === 0) {
      app.method.mensagem("Informe o Nome e Sobrenome, por favor.");
      return;
    }

    if (celular.length === 0) {
      app.method.mensagem("Informe o Celular, por favor.");
      return;
    }

    if (FORMA_SELECIONADA == null) {
      app.method.mensagem("Selecione a forma de pagamento.");
      return;
    }

    // 🔢 Calcula subtotal (sem taxa)
    let subtotal = 0;
    CARRINHO_ATUAL.forEach((item) => {
      let itemTotal = item.valor * item.quantidade;
      if (item.opcionais && item.opcionais.length > 0) {
        item.opcionais.forEach((op) => {
          itemTotal += op.valoropcional * item.quantidade;
        });
      }
      subtotal += itemTotal;
    });

    // 🎟️ Aplica desconto do cupom (se houver) — sempre sobre o subtotal
    let valorDesconto = carrinho.cupom?.valor || 0;

    // 🚚 Taxa de entrega (somente se for entrega)
    let taxaEntrega = checkEntrega ? TAXA_ATUAL : 0;

    // 💰 Valor final com desconto e taxa
    let valorTotal = subtotal + taxaEntrega - valorDesconto;

    // 📦 Monta o objeto do pedido
    const dados = {
      entrega: checkEntrega,
      retirada: checkRetirada,
      cart: CARRINHO_ATUAL,
      endereco: enderecoSelecionado,
      idtaxaentregatipo: TAXAS_ENTREGA[0]?.idtaxaentregatipo || null,
      idtaxaentrega: TAXA_ATUAL_ID,
      taxaentrega: TAXA_ATUAL,
      idformapagamento: FORMA_SELECIONADA.idformapagamento,
      troco: TROCO,
      nomecliente: nome,
      telefonecliente: celular,
      total: valorTotal,
      valor_desconto: valorDesconto,
      cupom_codigo: carrinho.cupom?.codigo || null,
    };

    // 🔄 Envia pedido
    app.method.loading(true);

    app.method.post(
      "/pedido",
      JSON.stringify(dados),
      (response) => {
        app.method.loading(false);

        if (response.status === "error") {
          app.method.mensagem(response.message);
          return;
        }

        app.method.mensagem("Pedido realizado!", "green");

        dados.order = response.order;
        app.method.gravarValorSessao(JSON.stringify(dados), "order");

        setTimeout(() => {
          localStorage.removeItem("cart");
          location.reload();
        }, 3000);

        // ✅ Finaliza via WhatsApp
        carrinho.method.finalizarPedido(dados);
      },
      (error) => {
        console.log("Erro ao finalizar pedido:", error);
        app.method.loading(false);
      },
      true
    );
  },

  finalizarPedido: (dados) => {
    let formaDePagamento = "";

    switch (dados.idformapagamento) {
      case 1:
        formaDePagamento = "PIX";
        break;
      case 2:
        formaDePagamento = "DINHEIRO";
        break;
      case 3:
        formaDePagamento = "CARTÃO DE CRÉDITO";
        break;
      case 4:
        formaDePagamento = "CARTÃO DE DÉBITO";
        break;
      default:
        formaDePagamento = "Não especificado";
    }

    let texto = `*Olá! Me chamo ${dados.nomecliente}, gostaria de fazer um pedido:*`;
    texto += `\n📞 Meu contato: *${dados.telefonecliente}*`;
    texto += `\n\n🛒 *Produtos no carrinho:*`;

    dados.cart.forEach((item) => {
      let subtotalItem = item.quantidade * item.valor;

      texto += `\n\n━━━━━━━━━━━━━━━━━━━━`;
      texto += `\n*${item.quantidade}x ${item.nome}*`;
      texto += `\n💵 Subtotal: R$ ${subtotalItem.toFixed(2)}`;

      if (item.opcionais && item.opcionais.length > 0) {
        texto += `\n➕ *Opcionais:*`;
        item.opcionais.forEach((opcional) => {
          texto += `\n  - ${item.quantidade}x ${opcional.nomeopcional} (+ R$ ${(
            item.quantidade * opcional.valoropcional
          ).toFixed(2)})`;
        });
      }

      if (item.observacao && item.observacao.trim() !== "") {
        texto += `\n📝 *Observação:* ${item.observacao}`;
      }
    });

    texto += `\n\n━━━━━━━━━━━━━━━━━━━━`;
    texto += `\n💳 *Forma de pagamento:* ${formaDePagamento}`;

    if (dados.retirada) {
      texto += `\n🏃‍♂️ *Retirada no local*`;
    } else {
      texto += `\n🚚 *Entrega*`;
      if (dados.endereco) {
        texto += `\n📍 *Endereço de entrega:* ${dados.endereco.endereco}, ${dados.endereco.numero} - ${dados.endereco.bairro}, ${dados.endereco.cidade} - ${dados.endereco.estado}`;
      }
      texto += `\n📦 *Taxa de entrega:* R$ ${dados.taxaentrega.toFixed(2)}`;
    }

    texto += `\n\n💰 *Valor total do pedido:* R$ ${dados.total.toFixed(2)}`;

    // 🔗 Link para acompanhar pedido
    texto += `\n\n📍 *Acompanhe seu pedido:* https://sistemachefdelivery.com.br/pedido.html`;

    let encode = encodeURIComponent(texto);
    let url = `https://wa.me/5533999694795?text=${encode}`;

    // ✅ Cria link e simula clique
    let link = document.createElement("a");
    link.href = url;
    link.target = "_blank"; // Abre em nova aba
    link.style.display = "none";
    document.body.appendChild(link);

    setTimeout(() => {
      link.click();
      document.body.removeChild(link); // Remove o link após clique
    }, 100); // Atraso mínimo
  },
};

carrinho.template = {
  produto: `
        <div class="card mb-2 pr-0">
            <div class="container-detalhes">
                <div class="detalhes-produto">
                    <div class="infos-produto">
                        <p class="name"><b>\${nome}</b></p>
                        <p class="price"><b>\${preco}</b></p>
                    </div>
                    \${opcionais}
                    \${obs}
                </div>
                <div class="detalhes-produto-edit" onclick="carrinho.method.abrirModalOpcoesProduto('\${guid}')">
                    <i class="fas fa-pencil-alt"></i>
                </div>
            </div>
        </div>
    `,

  opcional: `
        <div class="infos-produto">
            <p class="name-opcional mb-0">\${nome}</p>
            <p class="price-opcional mb-0">\${preco}</p>
        </div>
    `,

  obs: `
        <div class="infos-produto">
            <p class="obs-opcional mb-0">- \${observacao}</p>
        </div>
    `,
};
