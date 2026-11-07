/* D-Calculator — 1: Cálculo (modo de cálculo geral) */
(function () {
  'use strict';
  const M = DMath, esc = D.esc;
  const ed = new D.Editor();
  const hist = [];
  let page = 0, just = false, rec = -1;

  const PAGES = [
    [['x!', '!'], ['nPr', 'nPr('], ['nCr', 'nCr('], ['Abs', 'Abs('], ['Ran#', 'Ran#'], ['▷']],
    [['sinh', 'sinh('], ['cosh', 'cosh('], ['tanh', 'tanh('], ['Int', 'Int('], ['Frac', 'Frac('], ['▷']],
    [['d/dx', 'd/dx('], ['∫dx', '∫('], ['Σ', 'Σ('], ['MDC', 'gcd('], ['MMC', 'lcm('], ['▷']],
    [['MOD', 'mod('], ['logab', 'log('], ['%', '%'], ['Intg', 'Intg('], ['LIMPAR', '#CLR'], ['▷']]
  ];
  const OPS = ['+', '−', '×', '÷', '^', '²', '⁻¹', '!', '→', '⌟', 'ˣ√(', '%'];

  // mostra fração automaticamente em contas simples com divisões (ex.: 1÷3 → ⅓)
  function autoFrac(text, v) {
    if (Number.isInteger(v) || !/[÷⌟]/.test(text)) return false;
    if (/[a-zA-Z.πᴇ√∛%#∫Σ]/.test(text)) return false;
    return !!M.toFrac(v, 9999);
  }
  const resHTML = e => (e.frac ? M.fracHTML(M.toFrac(e.v, 1e6)) : M.fmtHTML(e.v));

  function exe() {
    let toks = ed.t;
    if (ed.empty) {
      if (!hist.length) return;
      toks = hist[hist.length - 1].toks;
    }
    const text = toks.join('');
    const v = M.evaluate(text);
    M.vars.Ans = v;
    hist.push({ toks: toks.slice(), v, frac: autoFrac(text, v) });
    if (hist.length > 60) hist.shift();
    ed.clear();
    just = true;
    rec = -1;
  }

  D.register('run', {
    title: 'Cálculo', color: '#2f6fe0', icon: '<span>×÷<br>+−</span>',
    fkeys: () => PAGES[page].map(p => p[0]),
    render(v) {
      let h = '<div class="run">';
      for (const e of hist.slice(-25)) h += `<div class="h-in">${esc(e.toks.join(''))}</div><div class="h-out">${resHTML(e)}</div>`;
      h += `<div class="h-in">${ed.html()}</div></div>`;
      v.innerHTML = h;
      v.firstChild.scrollTop = v.firstChild.scrollHeight;
    },
    input(s) {
      if (just && ed.empty && OPS.includes(s)) ed.ins('Ans');
      just = false;
      rec = -1;
      ed.ins(s);
    },
    key(c) {
      if (/^F[1-6]$/.test(c)) {
        const it = PAGES[page][+c[1] - 1];
        if (it[0] === '▷') page = (page + 1) % PAGES.length;
        else if (it[1] === '#CLR') { hist.length = 0; just = false; }
        else this.input(it[1]);
        return;
      }
      switch (c) {
        case 'EXE': exe(); return;
        case 'OPTN': page = (page + 1) % PAGES.length; return;
        case 'VARS': this.input('Ans'); return;
        case 'EXIT': page = 0; return;
        case 'FD': {
          const e = hist[hist.length - 1];
          if (e && M.toFrac(e.v, 1e6) && !Number.isInteger(e.v)) e.frac = !e.frac;
          return;
        }
        case 'AC': ed.clear(); just = false; rec = -1; return;
        case 'UP':
          if (!hist.length) return;
          rec = rec < 0 ? hist.length - 1 : Math.max(0, rec - 1);
          ed.set(hist[rec].toks); just = false;
          return;
        case 'DOWN':
          if (rec < 0) return;
          rec++;
          if (rec >= hist.length) { rec = -1; ed.clear(); } else ed.set(hist[rec].toks);
          return;
        case 'LEFT': case 'RIGHT':
          if (just && ed.empty && hist.length) {
            ed.set(hist[hist.length - 1].toks);
            if (c === 'RIGHT') ed.c = 0;
            just = false;
            return;
          }
          ed.key(c);
          return;
        default: ed.key(c);
      }
    }
  });
})();
