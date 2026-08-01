import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { TestModeBanner } from "@/components/TestModeBanner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title:
    "Canhão de Espuma à Gravidade SIGMA 10930 — Canhão de Espuma · SGT Tools",
  description:
    "Canhão de Espuma Canhão de Espuma à Gravidade SIGMA 10930: ultraleve 350g, filtro interno, ajuste de concentração, conexão 1/4″. Frete grátis e 10x sem juros.",
  icons: {
    icon: "/seo/favicon.ico",
    apple: "/seo/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} h-full`}>
      <head>
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '27349653094733875');
fbq('track', 'PageView');
`}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=27349653094733875&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}

        {/* Traffik — captura de UTMs */}
        <Script id="traffik-utm" strategy="afterInteractive">{`
(function () {
  "use strict";
  var ACCOUNT = "cmry50c910000p4k8lenqkd8e";
  var WS = "ws18de2ba42f5c4a3fad71bc7417b1e623";
  var API = "https://342dd-virid.vercel.app";
  var COOKIE = "traffik_track", SESSION = "traffik_session", DAYS = 30;
  var UTM = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  var IDS = ["fbclid","gclid","ttclid"];
  var CHECKOUT = ["hotmart","kirvano","cartpanda","kiwify","monetizze","pay.","checkout"];

  function readCookie(n){var m=document.cookie.match("(^|;)\\\\s*"+n+"\\\\s*=\\\\s*([^;]+)");return m?decodeURIComponent(m.pop()):null;}
  function writeCookie(n,v,d){var e=new Date(Date.now()+d*864e5).toUTCString();document.cookie=n+"="+encodeURIComponent(v)+";expires="+e+";path=/;SameSite=Lax";}
  function stored(){try{return JSON.parse(readCookie(COOKIE)||"{}");}catch(e){return {};}}
  function merge(a,b){var o={},k;for(k in a)o[k]=a[k];for(k in b)o[k]=b[k];return o;}
  function fromUrl(){var o={},q=new URLSearchParams(location.search);UTM.concat(IDS).forEach(function(k){var v=q.get(k);if(v)o[k]=v;});return o;}

  var fresh=fromUrl(), has=Object.keys(fresh).length>0, data=has?merge(stored(),fresh):stored();
  if(has||!readCookie(COOKIE))writeCookie(COOKIE,JSON.stringify(data),DAYS);

  window.traffik=window.traffik||{};
  window.traffik.getData=function(){return merge(stored(),{account:ACCOUNT});};
  window.traffik.data=data;

  function decorate(){
    var qs=[];UTM.concat(IDS).forEach(function(k){if(data[k])qs.push(k+"="+encodeURIComponent(data[k]));});
    if(data.click_id)qs.push("click_id="+encodeURIComponent(data.click_id));
    if(!qs.length)return;
    var links=document.getElementsByTagName("a");
    for(var i=0;i<links.length;i++){
      var href=links[i].getAttribute("href")||"";
      var isCheckout=CHECKOUT.some(function(d){return href.indexOf(d)>-1;});
      if(!isCheckout)continue;
      links[i].href=href+(href.indexOf("?")>-1?"&":"?")+qs.join("&");
    }
  }

  function send(){
    if(sessionStorage.getItem(SESSION)){decorate();return;}
    var payload=merge(data,{account:ACCOUNT,url:location.href,referrer:document.referrer||null});
    if(WS)payload.ws=WS;
    try{payload.tz=Intl.DateTimeFormat().resolvedOptions().timeZone||null;}catch(e){}
    var ep=API+"/api/track/click";
    function done(id){if(id){data.click_id=id;writeCookie(COOKIE,JSON.stringify(data),DAYS);window.traffik.data=data;}sessionStorage.setItem(SESSION,"1");decorate();}
    if(typeof fetch==="function"){
      fetch(ep,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(payload),keepalive:true,mode:"cors"})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(res){done(res&&res.click_id);})
        .catch(function(){if(navigator.sendBeacon){navigator.sendBeacon(ep,JSON.stringify(payload));}done(null);});
    }else if(navigator.sendBeacon){navigator.sendBeacon(ep,JSON.stringify(payload));done(null);}
    else{decorate();}
  }

  if(document.readyState==="complete"||document.readyState==="interactive")send();
  else window.addEventListener("DOMContentLoaded",send);
})();
`}</Script>

        {/* Traffik Pixel */}
        <Script id="traffik-pixel" strategy="afterInteractive">{`
(function () {
  "use strict";
  var CONFIG = "cms9ny4pg000004jn6s8hceyq";
  var API = "https://342dd-virid.vercel.app";
  var LEAD = false;
  var ADD_TO_CART = false;
  var IC = { type: "", value: "" };
  var CHECKOUT = [];
  var ALHEIOS = ["PageView"];
  var DET = "v2.l0.a0.iclique_checkout.vztntfp.n1.d10e7o8l";
  var NATIVO = true;

  function fbclid() {
    try {
      if (window.traffik && typeof window.traffik.getData === "function") { var d = window.traffik.getData(); if (d && d.fbclid) return d.fbclid; }
      var m = document.cookie.match(/traffik_track\\s*=\\s*([^;]+)/);
      if (m) { var j = JSON.parse(decodeURIComponent(m[1])); if (j.fbclid) return j.fbclid; }
      var q = new URLSearchParams(location.search); return q.get("fbclid");
    } catch (e) { return null; }
  }
  function hash(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h.toString(36);
  }
  function eid(name) {
    return name + "-" + hash([CONFIG, name, location.href, fbclid() || "", Math.floor(Date.now() / 10000)].join("|"));
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

  var ESPERA_MS = 10000, PASSO_MS = 200;
  var fila = [], relogio = null, inicio = 0;

  function temFbq() { return typeof window.fbq === "function"; }
  // params repassa value/currency ao pixel nativo. Sem isso o Purchase chega a
  // Meta sem valor e nao alimenta ROAS nem lances por valor.
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
      "Confira se o codigo do Facebook esta nesta pagina e, se estiver, cole o script da Traffik DEPOIS dele."
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
    if (ALHEIOS.indexOf(event) > -1) return "alheio";
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
    var espelho = espelhar(event, id, params);
    var payload = { pixelConfigId: CONFIG, event: event, eventId: id, url: location.href, fbclid: fbclid(), espelho: espelho, det: DET };
    if (extra) for (var k in extra) payload[k] = extra[k];
    enviar(payload);
  }
  window.traffikPixel = { track: track };

  track("PageView");

  if (LEAD) document.addEventListener("submit", function () { track("Lead"); }, true);

  if (ADD_TO_CART) document.addEventListener("click", function (e) {
    var el = e.target; while (el && el !== document.body) {
      var t = (el.textContent || "").toLowerCase(), c = (el.className || "") + " " + (el.id || "");
      if (/adicionar ao carrinho|add to cart|comprar/.test(t) || /cart|carrinho/i.test(c)) { track("AddToCart"); return; }
      el = el.parentElement;
    }
  }, true);

  if (IC) {
    if (IC.type === "clique_checkout") {
      document.addEventListener("click", function (e) {
        var el = e.target, href = "";
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
`}</Script>
      </head>
      <body className="min-h-full flex flex-col">
        <TestModeBanner />
        {children}
      </body>
    </html>
  );
}
