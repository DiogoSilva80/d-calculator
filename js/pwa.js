/* D-Calculator — instalar como app (ecrã principal) e funcionar sem internet */
(() => {
  if ('serviceWorker' in navigator && location.protocol !== 'file:')
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  const how = document.getElementById('install-how');
  const btn = document.getElementById('install-btn');
  if (!how || !btn) return;

  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const SHARE = '<svg width="14" height="16" viewBox="0 0 14 16" aria-label="ícone Partilhar" role="img">' +
    '<path d="M7 1v9M3.5 4.5 7 1l3.5 3.5M4.5 7H2v8h10V7H9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  if (ios) {
    how.innerHTML = `No Safari, toca em <b>Partilhar</b> ${SHARE} (no iOS 26 está no menu <b>···</b>) e depois em <b>Adicionar ao ecrã principal</b>.`;
  } else if (android) {
    how.innerHTML = 'No menu <b>⋮</b> do browser, toca em <b>Instalar app</b> ou <b>Adicionar ao ecrã principal</b>.';
  } // no computador fica o texto da página, com os passos para os dois telemóveis

  // Chrome e Edge (Android e computador) deixam instalar com um botão
  let prompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    prompt = e;
    btn.hidden = false;
    if (android) how.textContent = 'Fica no ecrã principal, abre só a calculadora e funciona sem internet.';
  });
  btn.addEventListener('click', async () => {
    if (!prompt) return;
    prompt.prompt();
    try { await prompt.userChoice; } catch (e) { /* ignorado */ }
    prompt = null;
    btn.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    btn.hidden = true;
    how.textContent = 'Instalada! Abre o D-Calculator a partir do ecrã principal.';
  });
})();
