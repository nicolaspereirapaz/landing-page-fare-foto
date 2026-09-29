# Landing Page - Fare Foto

Landing page institucional estática da Fare Foto, com a campanha **Outubro Rosa** em `/outubro-rosa/`.

## Estrutura

- `index.html`, `style.css`, `script.js` — página institucional (com faixa, link no menu e seção de destaque da campanha)
- `img/` — logo, foto do hero e galeria
- `outubro-rosa/` — campanha (site estático, sem build)
  - `index.html` — vitrine com busca e categorias
  - `produto/index.html` — página do produto (`/outubro-rosa/produto/?id=...`)
  - `carrinho/index.html` — carrinho que monta o pedido de orçamento para o WhatsApp (11) 95314-7703
  - `campanha.css` — estilos da campanha
  - `js/core.js` — preços, carrinho e mensagem (testado em `tests/`)
  - `js/ui.js`, `js/listagem.js`, `js/produto.js`, `js/carrinho.js` — telas
  - `data/products.json` — catálogo exportado (só dados públicos: sem custo, sem código interno)
  - `img/produtos/` — fotos dos produtos em WebP (servidas pelo próprio site)

## Como abrir localmente

As páginas da campanha carregam `data/products.json`, então precisam de um servidor (não abra direto pelo arquivo):

```bash
python -m http.server 8080
# http://localhost:8080  e  http://localhost:8080/outubro-rosa/
```

## Atualizar os produtos da campanha

O catálogo vem do banco local do projeto `fare_new_project`. Para atualizar preços, cores, estoque e fotos:

```bash
cd ../fare_new_project
npm run export:landing -- ../landing-page-fare-foto
```

Depois faça commit e push desta pasta; a Vercel publica sozinha.

## Testes da campanha

```bash
node --test outubro-rosa/tests/core.test.mjs
```

## Regra de preço exibida

Preço por unidade = custo × 2 + frete de R$ 100 rateado pela quantidade. Referência "a partir de" = pedido de 100 unidades.
Os valores são estimativas; personalização, frete ao cliente e prazo são confirmados no orçamento pelo WhatsApp.