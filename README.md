# D-Calculator

Calculadora gráfica online e grátis, que funciona no browser: cálculos, gráficos, tabelas, equações, estatística e matrizes.

**Site:** https://diogosilva80.github.io/d-calculator/

- **Abrir no computador:** duplo clique em `index.html`.

---

## 1. Publicação (GitHub Pages)

O site é publicado pelo GitHub Pages a partir do ramo `main` deste repositório.

- **Ativar (só uma vez):** no GitHub, abre o repositório → **Settings → Pages** → em *Build and deployment* escolhe **Deploy from a branch**, depois o ramo **main** e a pasta **/ (root)** → **Save**.
- **Atualizar:** sempre que envias alterações para o `main` (`git push`), o site atualiza-se ao fim de cerca de 1 minuto.

## 2. Aparecer no Google

1. Abre **https://search.google.com/search-console** e entra com a tua conta Google.
2. Escolhe **Prefixo do URL** e escreve `https://diogosilva80.github.io/d-calculator/`.
3. Em verificação, escolhe **Etiqueta HTML**. O Google mostra algo como
   `<meta name="google-site-verification" content="ABC123…">`.
4. Mete essa linha no `<head>` do `index.html`, envia a alteração (`git push`), espera 1 minuto e clica em **Verificar**.
5. No menu **Sitemaps**, escreve `sitemap.xml` e clica em **Enviar**.
6. Em **Inspeção de URL**, cola o endereço do site e clica em **Pedir indexação**.

Normalmente o site começa a aparecer no Google ao fim de alguns dias a duas semanas. Pesquisar **"D-Calculator"** é a forma mais fácil de o encontrar. Para pesquisas genéricas (por exemplo, "calculadora gráfica"), ajuda partilhar o link noutros sítios.

## Ficheiros

| Ficheiro | Para que serve |
|---|---|
| `index.html` | A página do site |
| `css/style.css` | O aspeto (cores, teclas, ecrã) |
| `js/mathcore.js` | O motor matemático |
| `js/ui.js` | Ecrã, teclado e menu |
| `js/app-*.js` | Uma aplicação por ficheiro (Cálculo, Gráficos…) |
| `favicon.svg`, `icon-*.png`, `apple-touch-icon.png` | Ícones do separador e do ecrã inicial do telemóvel |
| `og-image.png` | Imagem que aparece ao partilhar o link |
| `manifest.webmanifest` | Permite "Adicionar ao ecrã principal" no telemóvel |
| `sitemap.xml`, `robots.txt` | Indicam ao Google onde está o site |
| `.nojekyll` | Diz ao GitHub Pages para publicar os ficheiros tal como estão |
