document.addEventListener("DOMContentLoaded", function (event) {
  pagamento.event.init();
});

var pagamento = {};
var SUB_ORDER = null;
var TOTAL_CARRINHO = 0;

var MP = null; // variavel do mercado pago
var BRICKS_BUILDER = null; // varial do mercado pago (container bricks)

pagamento.event = {
  init: () => {
    app.method.loading(true);

    // obter a suborder
    let subOrderAtual = app.method.obterValorSessao("sub-order");
    SUB_ORDER = subOrderAtual !== undefined ? JSON.parse(subOrderAtual) : null;

    if (SUB_ORDER === null) {
      window.location.href = "/index.html";
    }

    // obter o total do carrinho e depois os dados do MP
    pagamento.method.obterTotalCarrinho(pagamento.method.obterDadosMP);

    // ==============================
    // 🔁 Restaura PIX salvo no navegador (caso recarregue)
    // ==============================
    const pixId = localStorage.getItem("pix_id");
    const pixQr = localStorage.getItem("pix_qr");
    const pixTicket = localStorage.getItem("pix_ticket");
    const pixText = localStorage.getItem("pix_text");

    if (pixId && pixQr) {
      // monta o mesmo HTML do modal PIX
      let html = `
        <div class="text-center">
          <h5 class="mb-3">Escaneie o QR Code para pagar</h5>
          <img src="data:image/png;base64,${pixQr}" width="220" class="border p-2 rounded shadow-sm" />
          
          <p style="font-size:14px;margin-top:15px;">Ou copie o código PIX abaixo:</p>

          <div class="input-group mt-2 mb-3">
            <textarea id="pixCode" readonly class="form-control text-center" rows="3">${pixText}</textarea>
            <button class="btn btn-success" type="button" 
              onclick="navigator.clipboard.writeText('${pixText}'); app.method.mensagem('Código PIX copiado!','green')">
              <i class="fas fa-copy"></i> Copiar
            </button>
          </div>

          <p class="mt-2 text-warning"><b>Aguardando pagamento...</b></p>

          <a href="${pixTicket}" target="_blank" class="btn btn-primary mt-3">
            <i class="fas fa-external-link-alt"></i> Abrir no Mercado Pago
          </a>
        </div>
      `;

      app.method.exibirModalCustom("Pagamento PIX", html);

      // reinicia o monitoramento automático
      pagamento.method.iniciarVerificacaoPix();
    }

    // ==============================
    // Fim da restauração automática do PIX
    // ==============================
  },
};

pagamento.method = {
  obterTotalCarrinho: (callback) => {
    let total = 0;

    if (SUB_ORDER.cart.length > 0) {
      SUB_ORDER.cart.forEach((e, i) => {
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
      if (SUB_ORDER.taxaentrega > 0) {
        total += SUB_ORDER.taxaentrega;
      }
    }

    TOTAL_CARRINHO = total;
    document.getElementById("lblTotalCarrinho").innerText = `R$ ${total
      .toFixed(2)
      .replace(".", ",")}`;
    callback();
  },

  // obtem os dados do MP da empresa
  obterDadosMP: () => {
    app.method.get(
      "/pagamento/publickey",
      (response) => {
        console.log("response", response);
        app.method.loading(false);

        if (response.status === "error") {
          app.method.mensagem(response.message);
          return;
        }

        if (
          response.data[0].publickey === null ||
          response.data[0].publickey === ""
        ) {
          app.method.mensagem(
            "Pagamento online não habilitado para esta empresa"
          );
          setTimeout(() => {
            window.location.href = "/index.html";
          }, 2500);
          return;
        }

        MP = new MercadoPago(response.data[0].publickey, {
          locale: "pt",
        });

        BRICKS_BUILDER = MP.bricks();

        pagamento.method.renderPaymentBrick();
      },
      (error) => {
        console.log("error", error);
        app.method.loading(false);
      },
      true
    );
  },

  // renderiza as 'Formas de Pagamento' do MP
  renderPaymentBrick: async () => {
    const settings = {
      initialization: {
        amount: TOTAL_CARRINHO,
        payer: {
          firstName: SUB_ORDER.nomecliente,
          lastName: "",
          email: "",
        },
      },
      customization: {
        visual: {
          style: {
            theme: "default",
            customVariables: {
              baseColor: "#ffbf00",
              baseColorSecondVariant: "#ffda6f",
              buttonTextColor: "#000000",
            },
          },
        },
        paymentMethods: {
          creditCard: "all",
          bankTransfer: "all",
          atm: "all",
          maxInstallments: 1,
        },
      },
      callbacks: {
        onReady: () => {},
        onSubmit: ({ selectedPaymentMethod, formData }) => {
          // callback chamado quando há click no botão de envio de dados

          let dados = {
            formData: formData,
            selectedPaymentMethod: selectedPaymentMethod,
          };

          pagamento.method.gerarPagamento(dados);
        },
        onError: (error) => {
          // callback chamado para todos os casos de erro do Brick
          console.error(error);
          app.method.mensagem(error);
        },
      },
    };

    window.paymentBrickController = await BRICKS_BUILDER.create(
      "payment",
      "paymentBrick_container",
      settings
    );
  },

  gerarPagamento: (dados) => {
    app.method.loading(true);

    // cria uma variavel pro back saber se é um rascunho
    SUB_ORDER.pedidoRascunho = 1;

    // se já tiver um Pedido Em rascunho criado, só continua
    if (SUB_ORDER.payment_created_id > 0) {
      pagamento.method.pagar(dados);
    } else {
      // Primeiro, salva o pedido como rascunho para obter o ID gerado
      app.method.post(
        "/pedido",
        JSON.stringify(SUB_ORDER),
        (response) => {
          console.log(response);
          app.method.loading(false);

          if (response.status == "error") {
            console.log(response.message);
            return;
          }

          // salva o id do pedido gerado como rascunho
          SUB_ORDER.payment_created_id = response.order;
          app.method.gravarValorSessao(JSON.stringify(SUB_ORDER), "sub-order");

          // com o ID do peido no SUB_ORDER, chama o metodo para gerar o pagamento do MP
          pagamento.method.pagar(dados);
        },
        (error) => {
          console.log("error", error);
          app.method.loading(false);
        },
        true
      );
    }
  },

  // depois que salva o pedido, gera o pagamento
  pagar: (dados) => {
    dados.pedido = SUB_ORDER;

    app.method.post(
      "/pagamento",
      JSON.stringify(dados),
      (response) => {
        console.log("Resposta do pagamento:", response);
        app.method.loading(false);

        // 🔴 Se ocorreu erro de backend
        if (response.status === "error") {
          app.method.mensagem(response.message, "red");
          return;
        }

        // 💰 Se for PIX — exibe o QR Code e salva localmente
        if (response.qr_code_base64) {
          // 🔹 Salva dados do PIX no navegador
          localStorage.setItem("pix_id", response.id_mp);
          localStorage.setItem("pix_qr", response.qr_code_base64);
          localStorage.setItem("pix_ticket", response.ticket_url);
          localStorage.setItem("pix_text", response.qr_code_text);
          localStorage.setItem("pix_status", response.status_mp || "pending");

          let html = `
        <div class="text-center">
          <h5 class="mb-3">Escaneie o QR Code para pagar</h5>
          <img src="data:image/png;base64,${response.qr_code_base64}" width="220" class="border p-2 rounded shadow-sm" />
          
          <p style="font-size:14px;margin-top:15px;">Ou copie o código PIX abaixo:</p>

          <div class="input-group mt-2 mb-3">
            <textarea id="pixCode" readonly class="form-control text-center" rows="3">${response.qr_code_text}</textarea>
            <button class="btn btn-success" type="button" 
              onclick="navigator.clipboard.writeText('${response.qr_code_text}'); app.method.mensagem('Código PIX copiado!','green')">
              <i class="fas fa-copy"></i> Copiar
            </button>
          </div>

          <p class="mt-2 text-muted">Tempo restante para pagar: <b id="tempoPix">5:00</b></p>

          <a href="${response.ticket_url}" target="_blank" class="btn btn-primary mt-3">
            <i class="fas fa-external-link-alt"></i> Abrir no Mercado Pago
          </a>
        </div>
      `;

          app.method.exibirModalCustom("Pagamento PIX", html);

          // contador regressivo de 5 minutos
          let tempo = 300; // segundos
          const intervalo = setInterval(() => {
            const minutos = Math.floor(tempo / 60);
            const segundos = tempo % 60;
            const el = document.getElementById("tempoPix");
            if (!el) {
              clearInterval(intervalo);
              return;
            }
            el.innerText = `${minutos}:${segundos.toString().padStart(2, "0")}`;
            if (tempo-- <= 0) {
              clearInterval(intervalo);
              el.innerText = "Expirado";
              app.method.mensagem(
                "Tempo do QR Code expirado, gere novamente.",
                "red"
              );
            }
          }, 1000);

          // 🔁 Inicia verificação automática de
          localStorage.setItem("pix_id", response.id_mp);
          pagamento.method.iniciarVerificacaoPix();

          return;
        }

        // 💳 Se for cartão aprovado
        if (response.status_mp === "approved") {
          app.method.mensagem(
            "✅ Pagamento aprovado! Seu pedido foi confirmado.",
            "green"
          );

          const dados = pagamento.method.getDadosPedidoCompleto();
          if (dados) {
            pagamento.method.enviarPedidoWhatsApp(dados);
          } else {
            console.warn(
              "❌ Nenhum dado de pedido encontrado para enviar ao WhatsApp."
            );
          }

          localStorage.clear();
          setTimeout(() => {
            window.location.href = "/pedido.html";
          }, 2000);
          return;
        }

        // ⚠️ Caso o pagamento fique pendente (ex: análise)
        if (
          response.status_mp === "in_process" ||
          response.status_mp === "pending"
        ) {
          app.method.mensagem(
            "⚠️ Pagamento em análise. Assim que for aprovado, você será notificado.",
            "orange"
          );
          return;
        }

        // ❌ Caso seja recusado ou falhou
        if (
          response.status_mp === "rejected" ||
          response.status_mp === "cancelled" ||
          response.status_mp === "failure"
        ) {
          app.method.mensagem(
            "❌ Pagamento recusado! Verifique os dados e tente novamente.",
            "red"
          );
          return;
        }

        // 🔹 Caso genérico (nenhuma das opções acima)
        app.method.mensagem(
          "Não foi possível processar o pagamento. Tente novamente.",
          "red"
        );
      },
      (error) => {
        console.log("error", error);
        app.method.loading(false);
        app.method.mensagem(
          "Erro ao conectar com o servidor de pagamento.",
          "red"
        );
      },
      true
    );
  },

  iniciarVerificacaoPix: () => {
    const id = localStorage.getItem("pix_id");
    if (!id) return;

    console.log("🕓 Iniciando verificação PIX ID:", id);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/pagamento/status/${id}`);
        if (!res.ok) return;
        const data = await res.json();

        console.log("🔄 Verificando status PIX:", data);

        // ✅ Pagamento aprovado
        if (data.payment_status === "approved" || data.status === "approved") {
          clearInterval(interval);

          const dados = pagamento.method.getDadosPedidoCompleto();
          if (dados) {
            pagamento.method.enviarPedidoWhatsApp(dados);
          } else {
            console.warn(
              "❌ Nenhum dado de pedido encontrado para enviar ao WhatsApp."
            );
          }

          // 🔹 Limpa PIX ID e carrinho/suborder
          localStorage.removeItem("pix_id");
          localStorage.removeItem("sub-order");
          localStorage.removeItem("carrinho");
          sessionStorage.removeItem("sub-order");
          sessionStorage.removeItem("carrinho");

          // ✅ Mostra modal de confirmação
          const html = `
          <div class="text-center p-3">
            <i class="fas fa-check-circle text-success" style="font-size:60px;"></i>
            <h4 class="mt-3 text-success">Pagamento aprovado!</h4>
            <p>Seu pedido foi confirmado com sucesso 🍕</p>
            <p class="text-muted mb-2">Obrigado por comprar na <b>Pizzaria Maluca</b></p>
          </div>
        `;
          app.method.exibirModalCustom("Pagamento Aprovado ✅", html);

          // ⏳ Redireciona após 3 segundos
          localStorage.clear();
          setTimeout(() => {
            window.location.href = "/pedido.html";
          }, 9000);
        }

        // ❌ Pagamento recusado
        else if (data.status === "rejected") {
          clearInterval(interval);
          localStorage.removeItem("pix_id");
          app.method.mensagem("❌ Pagamento recusado. Tente novamente.", "red");
        }
      } catch (err) {
        console.error("❌ Erro ao verificar PIX:", err);
      }
    }, 7000); // verifica a cada 7 segundos
  },

  // === CARTÕES SALVOS ===
  carregarCartoesSalvos: () => {
    const idpedido = SUB_ORDER.payment_created_id || SUB_ORDER.idpedido;
    if (!idpedido) return;

    app.method.get(
      `/cartao/listar/${idpedido}`,
      (resp) => {
        if (resp.status === "success" && resp.data.length > 0) {
          const container = document.getElementById("savedCardsContainer");
          container.innerHTML = `
          <h5 class="text-center mb-3">Cartões salvos</h5>
        `;

          resp.data.forEach((card) => {
            container.innerHTML += `
            <div class="form-check mt-2 text-start">
              <input class="form-check-input" type="radio" 
                     name="savedCard" value="${card.idcartao_mp}" id="card-${
              card.idcartao
            }">
              <label class="form-check-label" for="card-${card.idcartao}">
                •••• ${card.last_four_digits} — ${card.expiration_month}/${
              card.expiration_year
            }
                <small class="text-muted d-block">${
                  card.cardholder_name || ""
                }</small>
              </label>
            </div>`;
          });

          container.innerHTML += `
          <div class="mt-3">
            <button class="btn btn-primary w-100" onclick="pagamento.method.pagarComCartaoSalvo()">
              <i class="fas fa-credit-card"></i> Pagar com cartão salvo
            </button>
          </div>`;
        }
      },
      (err) => console.error("Erro ao buscar cartões salvos:", err),
      true
    );
  },

  pagarComCartaoSalvo: () => {
    const selectedCard = document.querySelector(
      'input[name="savedCard"]:checked'
    );
    if (!selectedCard) {
      app.method.mensagem("Selecione um cartão salvo!", "red");
      return;
    }

    const dados = {
      selectedSavedCardId: selectedCard.value,
      pedido: SUB_ORDER,
    };

    app.method.loading(true);
    app.method.post(
      "/pagamento",
      JSON.stringify(dados),
      (response) => {
        app.method.loading(false);
        console.log("Pagamento com cartão salvo:", response);

        if (response.status === "error") {
          app.method.mensagem(response.message, "red");
          return;
        }

        if (response.status_mp === "approved") {
          app.method.mensagem(
            "✅ Pagamento aprovado! Seu pedido foi confirmado.",
            "green"
          );
          setTimeout(() => {
            window.location.href = "/pedido.html";
          }, 2000);
          return;
        }

        app.method.mensagem(
          "⚠️ Pagamento não aprovado. Verifique o cartão.",
          "red"
        );
      },
      (error) => {
        app.method.loading(false);
        console.error("Erro pagamento cartão salvo:", error);
        app.method.mensagem("Erro no servidor de pagamento.", "red");
      },
      true
    );
  },

  getDadosPedidoCompleto: () => {
    // tenta pegar o pedido salvo na sessão (mantido pelo carrinho)
    let dadosPedido = null;

    try {
      const subOrderData =
        app.method.obterValorSessao("sub-order") ||
        sessionStorage.getItem("sub-order") ||
        localStorage.getItem("sub-order");

      if (subOrderData) {
        dadosPedido = JSON.parse(subOrderData);
      }
    } catch (e) {
      console.warn("⚠️ Falha ao carregar sub-order:", e);
    }

    // valida se tem os dados essenciais
    if (
      !dadosPedido ||
      !dadosPedido.cart ||
      !dadosPedido.nomecliente ||
      !dadosPedido.telefonecliente
    ) {
      console.warn(
        "⚠️ Dados do pedido incompletos. Tentando recuperar do carrinho..."
      );
      const cartData = localStorage.getItem("cart");
      if (cartData)
        dadosPedido = { ...dadosPedido, cart: JSON.parse(cartData) };
    }

    return dadosPedido;
  },

  enviarPedidoWhatsApp: () => {
    const subOrderData = app.method.obterValorSessao("sub-order");
    if (!subOrderData) return;

    const dados = JSON.parse(subOrderData);
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

    let texto = `*Olá! Me chamo ${dados.nomecliente}, gostaria de confirmar meu pedido:*`;
    texto += `\n📞 Contato: *${dados.telefonecliente}*`;
    texto += `\n\n🛒 *Itens do pedido:*`;

    dados.cart.forEach((item) => {
      let subtotalItem = item.quantidade * item.valor;

      texto += `\n\n━━━━━━━━━━━━━━━━━━━━`;
      texto += `\n*${item.quantidade}x ${item.nome}*`;
      texto += `\n💵 Subtotal: R$ ${subtotalItem.toFixed(2)}`;

      if (item.opcionais?.length) {
        texto += `\n➕ *Opcionais:*`;
        item.opcionais.forEach((op) => {
          texto += `\n  - ${item.quantidade}x ${op.nomeopcional} (+ R$ ${(
            item.quantidade * op.valoropcional
          ).toFixed(2)})`;
        });
      }

      if (item.observacao?.trim()) {
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
        texto += `\n📍 *Endereço:* ${dados.endereco.endereco}, ${dados.endereco.numero} - ${dados.endereco.bairro}, ${dados.endereco.cidade} - ${dados.endereco.estado}`;
      }
      texto += `\n📦 *Taxa de entrega:* R$ ${dados.taxaentrega.toFixed(2)}`;
    }

    texto += `\n\n💰 *Total:* R$ ${dados.total.toFixed(2)}`;
    texto += `\n\n📍 *Acompanhe seu pedido:* https://www.trailerburguer.com.br/pedido.html?id=${dados.idpedido}`;
    texto += `\n\n✅ *Pagamento confirmado via PIX!* 💥`;
    texto += `\n\n*Obrigado pela preferência!* 🙏`;

    let encode = encodeURIComponent(texto);
    let url = `https://wa.me/5533998589550?text=${encode}`;

    // ✅ Simula clique para abrir o WhatsApp
    let link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.style.display = "none";
    document.body.appendChild(link);
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
    }, 100);
  },
};
