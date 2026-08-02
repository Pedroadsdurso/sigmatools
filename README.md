# SGT Tools — loja

Loja de produto único (Canhão de Espuma à Gravidade SIGMA 10930) em Next.js 16,
com checkout próprio de 3 etapas e pagamento Pix pela OnyxPag.

## Stack

- Next.js 16 (App Router, React 19, TypeScript strict)
- Tailwind CSS v4 com tokens `oklch`
- Pix via [OnyxPag](https://doc.onyxpag.com/)
- Rastreamento: Traffik (UTMs + pixel) e Meta Pixel

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

## Variáveis de ambiente

Todas são lidas **apenas no servidor** — nenhuma usa `NEXT_PUBLIC_` exceto a
URL pública. A OnyxPag autentica com `base64("<pk>:<sk>")`, ou seja, a chave
secreta entra em toda chamada e não pode ir para o navegador.

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `ONYXPAG_PUBLIC_KEY` | sim | Autenticação (par Basic) |
| `ONYXPAG_SECRET_KEY` | sim | Autenticação (par Basic) |
| `ONYXPAG_API_URL` | não | Padrão `https://api.onyxpag.com` |
| `NEXT_PUBLIC_SITE_URL` | em produção | `source_url` e `postbackUrl` da cobrança |
| `ONYXPAG_WEBHOOK_SECRET` | sim | Token que autentica o postback |

> **Deploy:** as chaves ficam só no `.env.local`, que é ignorado pelo git. Ao
> hospedar, cadastre-as no painel da hospedagem — sem isso o Pix não é gerado.
> Confira em `/api/checkout/health`, que diz o que está faltando sem expor valor
> nenhum.

## Comandos

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run lint     # ESLint
npm run typecheck
npm run check    # lint + typecheck + build
```

## Scripts auxiliares

```bash
node scripts/download-assets.mjs    # rebaixa os assets originais
node scripts/optimize-images.mjs    # converte imagens para WebP redimensionado
```

O otimizador reduziu os assets de 10,2 MB para 0,59 MB. Rode-o sempre que
adicionar imagem nova em `public/images`.

## Rotas de API

| Rota | O que faz |
| --- | --- |
| `POST /api/checkout/pix` | Cria a cobrança Pix (preço calculado no servidor) |
| `GET /api/checkout/status/[id]` | Consulta o status da transação |
| `POST /api/checkout/webhook` | Recebe o postback da OnyxPag |
| `GET /api/checkout/health` | Diagnóstico de configuração |

### Segurança do checkout

- O preço **nunca** vem do cliente: `lib/pricing.ts` recalcula tudo no servidor.
- O webhook da OnyxPag não é assinado, então o payload recebido não é fonte da
  verdade — a rota revalida o status consultando a API, e exige um token secreto
  na querystring.

## Eventos de rastreamento

Disparados por `lib/tracking.ts`, que envia para a Traffik e espelha no Meta
Pixel com o mesmo `event_id` (evita contagem dupla).

| Momento | Evento |
| --- | --- |
| Clique em "Comprar agora" | `InitiateCheckout` |
| Identificação preenchida | `Lead` |
| Pix gerado (aguardando) | `AddPaymentInfo` |
| Pagamento confirmado | `Purchase` |

## Pendências conhecidas

- **Cupons:** a lista em `src/data/product.ts` está vazia; qualquer código é
  recusado até você cadastrar os reais.
- **Cartão de crédito:** o formulário existe e valida, mas a cobrança não é
  enviada — a integração ativa cobre só Pix. Ao submeter, avisa e oferece o Pix.
- **Pedidos não são persistidos:** o webhook tem um `TODO` para gravar no banco
  ou ERP. Precisa ser idempotente (a OnyxPag reenvia eventos).
