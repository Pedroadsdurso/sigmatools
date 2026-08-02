/*! Traffik Pixel */
(function () {
  "use strict";
  var CONFIG = "cms9ny4pg000004jn6s8hceyq";
  var API = "https://342dd-virid.vercel.app";
  var LEAD = false;
  var ADD_TO_CART = false;
  var IC = { type: "", value: "" };
  var CHECKOUT = [];
  // Eventos cujo dono NÃO é a Traffik. Só afeta o espelho no pixel nativo:
  // o POST para nós continua, porque o funil e o Dashboard contam do nosso
  // banco e não podem perder uma etapa por causa de uma escolha de pixel.
  var ALHEIOS = ["PageView"];
  // O que ESTE snippet detecta, congelado no momento em que ele foi gerado.
  var DET = "v2.l0.a0.iclique_checkout.vztntfp.n1.d10e7o8l";
  // Há pixel nativo da Meta nesta página? Sem ele não existe o que espelhar.
  var NATIVO = true;

  function fbclid() {
    try {
      if (window.traffik && typeof window.traffik.getData === "function") { var d = window.traffik.getData(); if (d && d.fbclid) return d.fbclid; }
      var m = document.cookie.match(/traffik_track\s*=\s*([^;]+)/);
      if (m) { var j = JSON.parse(decodeURIComponent(m[1])); if (j.fbclid) return j.fbclid; }
      var q = new URLSearchParams(location.search); return q.get("fbclid");
    } catch (e) { return null; }
  }
  // Hash estável (FNV-1a) — só para derivar um id curto e reproduzível.
  function hash(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h.toString(36);
  }
  /**
   * ÂNCORA DO CARREGAMENTO — um valor por pageview, gerado uma vez.
   *
   * Substitui os três ingredientes instáveis que o id usava antes
   * (location.href, fbclid e um balde fixo de tempo). Medido em produção em
   * 01/08/2026, os três divergiam de verdade entre dois POSTs do MESMO
   * carregamento — e id diferente é linha duplicada no banco e evento contado
   * duas vezes na Meta.
   */
  var ANCORA = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var ultimoDeAcao = {};
  var JANELA_ACAO_MS = 1000;
  /**
   * Id do evento — DETERMINÍSTICO, e a âncora NÃO é global: é por evento.
   *
   * PageView e eventos de ação têm desenhos diferentes de propósito:
   * dois PageView no mesmo carregamento são a MESMA visita contada duas vezes,
   * e devem sempre virar um só. Já dois cliques em "comprar" separados por
   * segundos podem ser duas intenções reais, e deduplicá-los apagaria uma
   * delas do funil — por isso a janela curta e deslizante.
   *
   * O que saiu da chave, e por quê:
   *
   * - location.href virou location.pathname. Medido: o mesmo load POSTou
   *   /checkout?qty=1 e, 4 ms depois, /checkout?product=...&qty=1. O caminho
   *   não muda; a querystring, sim.
   * - fbclid saiu. Se o cookie ainda não foi lido na 1a chamada e já foi na
   *   2a, o id muda. A âncora já distingue visitantes.
   * - O balde de 10 s saiu. Era Math.floor(Date.now()/10000): FIXO, não
   *   deslizante. Duas chamadas a 921 ms de distância caíram em baldes
   *   diferentes só por cruzarem a fronteira.
   *
   * Aumentar o balde não era conserto: só dilui a probabilidade e passa a
   * juntar ações genuinamente distintas. O tempo tinha de SAIR da chave.
   */
  function eid(name) {
    if (name === "PageView") return name + "-" + hash([CONFIG, name, location.pathname, ANCORA].join("|"));
    // Eventos de AÇÃO: janela DESLIZANTE, ancorada no primeiro disparo — nunca
    // um balde fixo, que é o que criava a fronteira.
    var agora = Date.now(), u = ultimoDeAcao[name];
    if (u && agora - u.t <= JANELA_ACAO_MS) return u.id;
    var id = name + "-" + hash([CONFIG, name, location.pathname, ANCORA, agora].join("|"));
    ultimoDeAcao[name] = { id: id, t: agora };
    return id;
  }

  function enviar(payload) {
    try {
      fetch(API + "/api/pixel/event", { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload), keepalive: true, mode: "cors" }).catch(function () {});
    } catch (e) {}
  }
  function aviso(msg) {
    try { if (window.console && window.console.warn) window.console.warn("[Traffik Pixel] " + msg); } catch (e) {}
  }
  function relatar(event, id, estado) {
    enviar({ pixelConfigId: CONFIG, event: event, eventId: id, espelho: estado, somenteEspelho: true });
  }

  /**
   * Espelho no pixel NATIVO da Meta, com o MESMO event_id.
   *
   * É isto que faz a deduplicação existir. Sem o espelho, o pixel do navegador
   * manda o evento com um id dele e nós mandamos pela CAPI com o nosso — a
   * Meta recebe dois eventos sem nada em comum e conta os dois, inflando o
   * sinal que otimiza a campanha.
   *
   * Se fbq ainda não existe (ordem de carregamento), o espelho entra numa fila
   * e sai assim que ele aparecer. Estourando o teto, avisa no console e grava
   * espelho: "sem-fbq" no evento — falhar calado aqui seria invisível.
   *
   * NUNCA definir window.fbq nós mesmos para "garantir" que existe: o código
   * da Meta começa com if (f.fbq) return, e um stub nosso faria o snippet do
   * usuário abortar inteiro.
   */
  var ESPERA_MS = 10000, PASSO_MS = 200;
  var fila = [], relogio = null, inicio = 0;

  function temFbq() { return typeof window.fbq === "function"; }

  // MODIFICACAO LOCAL (nao vem do snippet oficial da Traffik):
  // o parametro `params` repassa value/currency ao pixel nativo. O snippet
  // original manda sempre {}, e sem isso o Purchase chega a Meta SEM valor —
  // nao alimenta ROAS nem lance por valor. Reaplicar ao atualizar o snippet.
  function atirar(event, id, params) { window.fbq("track", event, params || {}, { eventID: id }); }
  function parar() { if (relogio) { clearInterval(relogio); relogio = null; } }

  function drenar() {
    var pend = fila; fila = []; parar();
    for (var i = 0; i < pend.length; i++) {
      try { atirar(pend[i].e, pend[i].id, pend[i].p); relatar(pend[i].e, pend[i].id, "adiado-ok"); }
      catch (err) { aviso("falha ao espelhar " + pend[i].e + ": " + err); relatar(pend[i].e, pend[i].id, "erro"); }
    }
  }

  function desistir() {
    var pend = fila; fila = []; parar();
    aviso(
      "o pixel do Facebook (fbq) nao apareceu em " + (ESPERA_MS / 1000) + "s. " +
      "Estes eventos foram so para o servidor, sem par no navegador, e a Meta pode conta-los em dobro: " +
      pend.map(function (p) { return p.e; }).join(", ") + ". " +
      "Confira se o codigo do Facebook esta nesta pagina — e, se estiver, carregue o script da Traffik DEPOIS dele."
    );
    for (var i = 0; i < pend.length; i++) relatar(pend[i].e, pend[i].id, "sem-fbq");
  }

  function aguardar() {
    if (relogio) return;
    inicio = Date.now();
    relogio = setInterval(function () {
      if (temFbq()) drenar();
      else if (Date.now() - inicio >= ESPERA_MS) desistir();
    }, PASSO_MS);
  }

  function espelhar(event, id, params) {
    if (ALHEIOS.indexOf(event) > -1) return "alheio"; // o dono deste evento e outro
    // Sem pixel nativo declarado: nao ha o que espelhar, e insistir geraria
    // 10s de espera + aviso no console em TODA visita de uma instalacao correta.
    if (!NATIVO) return "sem-nativo";
    if (temFbq()) {
      try { atirar(event, id, params); return "ok"; }
      catch (err) { aviso("falha ao espelhar " + event + ": " + err); return "erro"; }
    }
    fila.push({ e: event, id: id, p: params });
    aguardar();
    return "adiado";
  }

  function track(event, extra) {
    var id = eid(event);
    // Só value/currency vão ao pixel nativo; o resto de extra é interno da
    // Traffik e não deve virar parâmetro de anúncio.
    var params = {};
    if (extra && extra.value != null) { params.value = extra.value; params.currency = extra.currency || "BRL"; }
    // O espelho vem ANTES do payload: o estado dele viaja junto do evento, e é
    // o que permite responder "os espelhos estao saindo?" sem abrir o console.
    var espelho = espelhar(event, id, params);
    var payload = { pixelConfigId: CONFIG, event: event, eventId: id, url: location.href, fbclid: fbclid(), espelho: espelho, det: DET };
    if (extra) for (var k in extra) payload[k] = extra[k];
    enviar(payload);
  }
  window.traffikPixel = { track: track };

  // PageView: sempre ativo, dispara a cada carregamento de página.
  track("PageView");

  // Lead: dispara ao enviar qualquer formulário.
  if (LEAD) document.addEventListener("submit", function () { track("Lead"); }, true);

  // AddToCart: clique em elementos com cara de carrinho.
  if (ADD_TO_CART) document.addEventListener("click", function (e) {
    var el = e.target; while (el && el !== document.body) {
      var t = (el.textContent || "").toLowerCase(), c = (el.className || "") + " " + (el.id || "");
      if (/adicionar ao carrinho|add to cart|comprar/.test(t) || /cart|carrinho/i.test(c)) { track("AddToCart"); return; }
      el = el.parentElement;
    }
  }, true);

  // InitiateCheckout conforme a regra de detecção.
  if (IC) {
    if (IC.type === "clique_checkout") {
      document.addEventListener("click", function (e) {
        var el = e.target, href = "";
        // Sobe até o <a>: o clique costuma cair num <span>/<img> dentro do link.
        while (el && el !== document.body) {
          if (el.tagName === "A" && el.getAttribute("href")) { href = el.getAttribute("href"); break; }
          el = el.parentElement;
        }
        if (!href) return;
        var alvo = href.toLowerCase();
        for (var i = 0; i < CHECKOUT.length; i++) {
          if (alvo.indexOf(CHECKOUT[i]) > -1) { track("InitiateCheckout", { destino: href.slice(0, 500) }); return; }
        }
      }, true);
    } else if (IC.type === "contem_url") {
      if (location.href.indexOf(IC.value) > -1) track("InitiateCheckout");
    } else {
      document.addEventListener("click", function (e) {
        var el = e.target; while (el && el !== document.body) {
          if (IC.type === "contem_texto" && (el.textContent || "").toLowerCase().indexOf(IC.value.toLowerCase()) > -1) { track("InitiateCheckout"); return; }
          if (IC.type === "contem_css") { try { if (el.matches(IC.value.charAt(0) === "." || IC.value.charAt(0) === "#" ? IC.value : "." + IC.value)) { track("InitiateCheckout"); return; } } catch (err) {} }
          el = el.parentElement;
        }
      }, true);
    }
  }
})();
