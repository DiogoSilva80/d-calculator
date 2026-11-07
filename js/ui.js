/* D-Calculator — interface base: ecrã, teclado, editor, formulários e menu principal */
(function () {
  'use strict';
  const M = window.DMath;
  const D = window.D = { apps: {}, order: [], data: {}, cur: null, err: null, off: false, menuSel: 0 };
  const st = { shift: false, alpha: false, lock: false };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  D.esc = esc;

  /* ---------- memória persistente ---------- */
  const KEY = 'dcalc-v1';
  D.load = () => {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (o.settings) Object.assign(M.settings, o.settings);
      if (o.vars) Object.assign(M.vars, o.vars);
      if (o.data) D.data = o.data;
    } catch (e) { /* sem armazenamento: continua só em memória */ }
  };
  D.save = () => {
    if (D.noSave) return;
    try { localStorage.setItem(KEY, JSON.stringify({ settings: M.settings, vars: M.vars, data: D.data })); } catch (e) { }
  };
  D.reset = () => {
    D.noSave = true;
    try { localStorage.removeItem(KEY); } catch (e) { }
    location.reload();
  };

  /* ---------- editor de expressões (por tokens, como numa calculadora) ---------- */
  class Editor {
    constructor(toks) { this.set(toks || []); }
    set(toks) { this.t = toks.slice(); this.c = this.t.length; }
    ins(s) { this.t.splice(this.c, 0, s); this.c++; }
    del() { if (this.c > 0) this.t.splice(--this.c, 1); else if (this.t.length) this.t.splice(0, 1); }
    clear() { this.t = []; this.c = 0; }
    get text() { return this.t.join(''); }
    get empty() { return this.t.length === 0; }
    html() {
      let h = '';
      for (let i = 0; i <= this.t.length; i++) {
        if (i === this.c) h += '<span class="cur"></span>';
        if (i < this.t.length) h += esc(this.t[i]);
      }
      return h;
    }
    key(c) {
      switch (c) {
        case 'LEFT': if (this.c > 0) this.c--; return true;
        case 'RIGHT': if (this.c < this.t.length) this.c++; return true;
        case 'DEL': this.del(); return true;
        case 'AC': this.clear(); return true;
      }
      return false;
    }
  }
  D.Editor = Editor;
  D.splitNum = v => Array.from(M.numStr(v));

  /* ---------- formulário de campos numéricos ---------- */
  class Form {
    constructor(fields) { this.f = fields; this.sel = 0; this.ed = null; }
    html() {
      return '<div class="form">' + this.f.map((fd, i) => {
        const val = i === this.sel && this.ed ? this.ed.html() : esc(fd.show ? fd.show() : M.fmt(fd.get()));
        return `<div class="row${i === this.sel ? ' sel' : ''}" data-i="${i}"><span>${fd.label}</span><span class="val">${val}</span></div>`;
      }).join('') + '</div>';
    }
    input(s) { if (!this.ed) this.ed = new Editor(); this.ed.ins(s); }
    commit() {
      if (this.ed && !this.ed.empty) this.f[this.sel].set(M.evaluate(this.ed.text));
      this.ed = null;
    }
    key(c) {
      const n = this.f.length;
      if (this.ed) {
        if (c === 'EXE' || c === 'UP' || c === 'DOWN') {
          this.commit();
          this.sel = c === 'UP' ? Math.max(0, this.sel - 1) : Math.min(n - 1, this.sel + 1);
          return true;
        }
        if (c === 'EXIT') { this.ed = null; return true; }
        return this.ed.key(c);
      }
      if (c === 'UP') { this.sel = (this.sel + n - 1) % n; return true; }
      if (c === 'DOWN' || c === 'EXE') { this.sel = (this.sel + 1) % n; return true; }
      if (c === 'LEFT' || c === 'RIGHT') { this.ed = new Editor(D.splitNum(this.f[this.sel].get())); return true; }
      return false;
    }
    click(e) {
      const r = e.target.closest('[data-i]');
      if (r) { this.ed = null; this.sel = +r.dataset.i; }
    }
  }
  D.Form = Form;

  /* ---------- grelha editável (listas, matrizes, coeficientes) ---------- */
  class Grid {
    constructor(o) { Object.assign(this, { visible: 5 }, o); this.r = 0; this.c = 0; this.top = 0; this.ed = null; }
    html() {
      const R = this.rows(), C = this.cols(), vis = this.visible;
      this.r = Math.min(this.r, R - 1); this.c = Math.min(this.c, C - 1);
      if (this.r < this.top) this.top = this.r;
      if (this.r >= this.top + vis) this.top = this.r - vis + 1;
      let h = '<table class="grid"><tr><th></th>';
      for (let c = 0; c < C; c++) h += `<th>${this.head ? this.head(c) : c + 1}</th>`;
      h += '</tr>';
      for (let r = this.top; r < Math.min(R, this.top + vis); r++) {
        h += `<tr><th>${r + 1}</th>`;
        for (let c = 0; c < C; c++) {
          const sel = r === this.r && c === this.c;
          const v = sel && this.ed ? this.ed.html() : M.fmtShort(this.get(r, c));
          h += `<td class="${sel ? 'sel' : ''}" data-r="${r}" data-c="${c}">${v}</td>`;
        }
        h += '</tr>';
      }
      return h + '</table>';
    }
    input(s) { if (!this.ed) this.ed = new Editor(); this.ed.ins(s); }
    key(c) {
      if (this.ed) {
        if (c === 'EXE' || c === 'UP' || c === 'DOWN') {
          if (!this.ed.empty) this.set(this.r, this.c, M.evaluate(this.ed.text));
          this.ed = null;
          if (c === 'UP') { if (this.r > 0) this.r--; }
          else if (c === 'EXE' && this.across) {
            if (this.c < this.cols() - 1) this.c++;
            else if (this.r < this.rows() - 1) { this.c = 0; this.r++; }
          } else if (this.r < this.rows() - 1) this.r++;
          return true;
        }
        if (c === 'EXIT') { this.ed = null; return true; }
        return this.ed.key(c);
      }
      switch (c) {
        case 'UP': if (this.r > 0) this.r--; return true;
        case 'DOWN': if (this.r < this.rows() - 1) this.r++; return true;
        case 'LEFT': if (this.c > 0) this.c--; return true;
        case 'RIGHT': if (this.c < this.cols() - 1) this.c++; return true;
      }
      return false;
    }
    click(e) {
      const td = e.target.closest('td[data-r]');
      if (td) { this.ed = null; this.r = +td.dataset.r; this.c = +td.dataset.c; }
    }
  }
  D.Grid = Grid;

  /* ---------- mensagens de erro ---------- */
  const MSG = {
    syntax: 'Erro de Sintaxe', math: 'Erro Matemático', arg: 'Erro de Argumento',
    dim: 'Erro de Dimensão', nosol: 'Sem Solução', mem: 'Erro de Memória'
  };
  D.error = e => {
    if (typeof e === 'string') D.err = MSG[e] || e;
    else if (e && e.kind) D.err = MSG[e.kind] || e.kind;
    else { console.error(e); D.err = 'Erro'; }
  };

  /* ---------- registo de aplicações ---------- */
  D.register = (id, app) => { app.id = id; D.apps[id] = app; D.order.push(id); };
  D.open = id => {
    D.cur = D.apps[id];
    D.menuSel = Math.max(0, D.order.indexOf(id));
    if (D.cur.enter) D.cur.enter();
  };
  D.goMenu = () => { D.cur = null; };

  const MENU = {
    title: 'Menu Principal',
    render(v) {
      v.innerHTML = '<div class="menu">' + D.order.map((id, i) => {
        const a = D.apps[id];
        return `<div class="mi${i === D.menuSel ? ' sel' : ''}" data-i="${i}"><div class="ic" style="--c:${a.color}">${a.icon}</div><div class="ml">${i + 1} ${a.title}</div></div>`;
      }).join('') + '</div>';
    },
    key(c) {
      const n = D.order.length, s = D.menuSel;
      if (c === 'LEFT') D.menuSel = (s + n - 1) % n;
      else if (c === 'RIGHT') D.menuSel = (s + 1) % n;
      else if (c === 'UP') D.menuSel = s - 4 >= 0 ? s - 4 : s;
      else if (c === 'DOWN') D.menuSel = s + 4 < n ? s + 4 : s;
      else if (c === 'EXE') D.open(D.order[s]);
    },
    input(s) { if (/^[1-9]$/.test(s) && +s <= D.order.length) D.open(D.order[+s - 1]); },
    click(e) { const m = e.target.closest('[data-i]'); if (m) D.open(D.order[+m.dataset.i]); }
  };

  /* ---------- teclado ---------- */
  // id: [normal, SHIFT, ALPHA] — texto a inserir ou #COMANDO
  const ACT = {
    xtt: ['x', null, 'A'], log: ['log(', '10^(', 'B'], ln: ['ln(', 'e^(', 'C'],
    sin: ['sin(', 'sin⁻¹(', 'D'], cos: ['cos(', 'cos⁻¹(', 'E'], tan: ['tan(', 'tan⁻¹(', 'F'],
    frac: ['⌟', null, 'G'], fd: ['#FD', null, 'H'], lp: ['(', '∛(', 'I'], rp: [')', '⁻¹', 'J'],
    comma: [',', null, 'K'], store: ['→', null, 'L'], sq: ['²', '√(', null], pow: ['^', 'ˣ√(', null],
    k7: ['7', null, 'M'], k8: ['8', null, 'N'], k9: ['9', null, 'O'],
    k4: ['4', null, 'P'], k5: ['5', null, 'Q'], k6: ['6', null, 'R'], mul: ['×', null, 'S'], div: ['÷', null, 'T'],
    k1: ['1', null, 'U'], k2: ['2', null, 'V'], k3: ['3', null, 'W'], add: ['+', null, 'X'], sub: ['−', null, 'Y'],
    k0: ['0', null, 'Z'], dot: ['.', '=', null], exp: ['ᴇ', 'π', null], neg: ['⁻', 'Ans', null],
    exe: ['#EXE'], del: ['#DEL'], ac: ['#AC', '#OFF'], menu: ['#MENU', '#SETUP'], exit: ['#EXIT', '#QUIT'],
    optn: ['#OPTN'], vars: ['#VARS'], up: ['#UP'], down: ['#DOWN'], left: ['#LEFT'], right: ['#RIGHT'],
    f1: ['#F1'], f2: ['#F2'], f3: ['#F3'], f4: ['#F4'], f5: ['#F5'], f6: ['#F6']
  };
  // [id, rótulo, SHIFT, ALPHA, classe]
  const ROWS = {
    kf: [['f1', 'F1'], ['f2', 'F2'], ['f3', 'F3'], ['f4', 'F4'], ['f5', 'F5'], ['f6', 'F6']],
    kctl: [['shift', 'SHIFT', '', '', 'k-shift'], ['optn', 'OPTN'], ['vars', 'VARS'], ['menu', 'MENU', 'SET UP'],
      ['alpha', 'ALPHA', 'A-LOCK', '', 'k-alpha'], ['sq', 'x²', '√'], ['pow', '^', 'ˣ√'], ['exit', 'EXIT', 'QUIT']],
    ksci: [['xtt', 'X,θ,T', '', 'A'], ['log', 'log', '10ˣ', 'B'], ['ln', 'ln', 'eˣ', 'C'], ['sin', 'sin', 'sin⁻¹', 'D'],
      ['cos', 'cos', 'cos⁻¹', 'E'], ['tan', 'tan', 'tan⁻¹', 'F'], ['frac', 'a<sup>b</sup>/<sub>c</sub>', '', 'G'],
      ['fd', 'S⇔D', '', 'H'], ['lp', '(', '∛', 'I'], ['rp', ')', 'x⁻¹', 'J'], ['comma', ',', '', 'K'], ['store', '→', '', 'L']],
    knum: [['k7', '7', '', 'M'], ['k8', '8', '', 'N'], ['k9', '9', '', 'O'], ['del', 'DEL', '', '', 'k-del'], ['ac', 'AC', 'OFF', '', 'k-ac'],
      ['k4', '4', '', 'P'], ['k5', '5', '', 'Q'], ['k6', '6', '', 'R'], ['mul', '×', '', 'S'], ['div', '÷', '', 'T'],
      ['k1', '1', '', 'U'], ['k2', '2', '', 'V'], ['k3', '3', '', 'W'], ['add', '+', '', 'X'], ['sub', '−', '', 'Y'],
      ['k0', '0', '', 'Z'], ['dot', '.', '='], ['exp', '×10<sup>x</sup>', 'π'], ['neg', '(−)', 'Ans'], ['exe', 'EXE', '', '', 'k-exe']]
  };
  const keyHTML = ([id, l, s = '', a = '', cls = '']) =>
    `<div class="kw"><div class="kt"><span class="s">${s}</span><span class="a">${a}</span></div>` +
    `<button type="button" class="key ${cls}" data-k="${id}" aria-label="${esc(l.replace(/<[^>]+>/g, ''))}">${l}</button></div>`;

  function buildKeys(el) {
    const row = name => `<div class="krow ${name}">${ROWS[name].map(keyHTML).join('')}</div>`;
    el.innerHTML = row('kf') +
      `<div class="kmid">${row('kctl')}<div class="dpad">` +
      ['up', 'left', 'right', 'down'].map(d => `<button type="button" class="${d}" data-k="${d}" aria-label="${d}"><i></i></button>`).join('') +
      `</div></div>` + row('ksci') + row('knum');
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (b) press(b.dataset.k);
    });
  }

  function press(id) {
    if (id === 'shift') { st.shift = !st.shift; renderStatus(); return; }
    if (id === 'alpha') {
      if (st.shift) { st.lock = !st.lock; st.alpha = st.lock; st.shift = false; }
      else if (st.lock) { st.lock = false; st.alpha = false; }
      else st.alpha = !st.alpha;
      renderStatus();
      return;
    }
    const a = ACT[id];
    if (!a) return;
    let act = a[0];
    if (st.shift && a[1]) act = a[1];
    else if (st.alpha && !st.shift && a[2]) act = a[2];
    st.shift = false;
    if (!st.lock) st.alpha = false;
    D.dispatch(act);
  }

  D.dispatch = act => {
    if (D.off) { if (act === '#AC') D.off = false; D.render(); return; }
    if (D.err) { D.err = null; D.render(); return; }
    try {
      if (act === '#MENU' || act === '#QUIT') D.goMenu();
      else if (act === '#SETUP') D.open('system');
      else if (act === '#OFF') D.off = true;
      else {
        const app = D.cur || MENU;
        if (act[0] === '#' && act.length > 1) { if (app.key) app.key(act.slice(1)); }
        else if (app.input) app.input(act);
      }
    } catch (e) { D.error(e); }
    D.render();
    D.save();
  };

  /* ---------- teclado físico ---------- */
  const KB = {
    Enter: '#EXE', Backspace: '#DEL', Delete: '#AC', Escape: '#EXIT', Home: '#MENU',
    ArrowUp: '#UP', ArrowDown: '#DOWN', ArrowLeft: '#LEFT', ArrowRight: '#RIGHT',
    F1: '#F1', F2: '#F2', F3: '#F3', F4: '#F4', F5: '#F5', F6: '#F6',
    '*': '×', '/': '÷', '-': '−', '+': '+', '^': '^', '(': '(', ')': ')', '.': '.', ',': ',',
    '!': '!', '=': '=', '%': '%'
  };
  const REV = {};
  for (const id in ACT) if (!REV[ACT[id][0]]) REV[ACT[id][0]] = id;
  function flash(act) {
    const id = REV[act];
    const b = id && document.querySelector(`[data-k="${id}"]`);
    if (!b) return;
    b.classList.add('press');
    setTimeout(() => b.classList.remove('press'), 110);
  }
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let act = e.code === 'NumpadDecimal' ? '.' : KB[e.key];
    if (!act && /^[0-9]$/.test(e.key)) act = e.key;
    if (!act && /^[a-zA-Z]$/.test(e.key)) act = e.key === 'X' ? 'x' : e.key;
    if (!act) return;
    e.preventDefault();
    flash(act);
    D.dispatch(act);
  });

  /* ---------- desenho do ecrã ---------- */
  let $screen, $status, $view, $fbar, $pop;
  const BATTERY = '<svg width="18" height="9" viewBox="0 0 18 9" aria-hidden="true"><rect x=".5" y=".5" width="15" height="8" rx="1.5" fill="none" stroke="currentColor"/><rect x="2" y="2" width="11" height="5" fill="currentColor"/><rect x="16" y="3" width="1.5" height="3" fill="currentColor"/></svg>';
  function renderStatus() {
    const a = D.cur || MENU, s = M.settings;
    const ind = st.shift ? '<b class="ind s">S</b>' : st.lock ? '<b class="ind a">A</b>' : st.alpha ? '<b class="ind a">a</b>' : '<b class="ind"></b>';
    const disp = s.display === 'norm' ? 'Norm' : (s.display === 'fix' ? 'Fix' : 'Sci') + s.digits;
    $status.innerHTML = `${ind}<span class="st">${a.title}</span><span class="sp"></span><span>${{ deg: 'Deg', rad: 'Rad', gra: 'Gra' }[s.angle]}</span><span>${disp}</span>${BATTERY}`;
    document.body.classList.toggle('is-shift', st.shift);
    document.body.classList.toggle('is-alpha', st.alpha);
  }
  D.render = () => {
    const a = D.cur || MENU;
    renderStatus();
    a.render($view);
    const fk = a.fkeys ? a.fkeys() : [];
    let h = '';
    for (let i = 0; i < 6; i++) h += `<div class="fk${fk[i] ? '' : ' empty'}" data-f="${i + 1}">${fk[i] || ''}</div>`;
    $fbar.innerHTML = h;
    $pop.innerHTML = D.err ? `<div class="popup"><div class="pt">${esc(D.err)}</div><div class="ps">Prima: [EXIT]</div></div>` : '';
    $screen.classList.toggle('off', D.off);
  };

  D.start = () => {
    D.load();
    $screen = document.getElementById('screen');
    $status = document.getElementById('status');
    $view = document.getElementById('view');
    $fbar = document.getElementById('fbar');
    $pop = document.getElementById('pop');
    buildKeys(document.getElementById('keys'));
    $fbar.addEventListener('click', e => { const f = e.target.closest('[data-f]'); if (f && !f.classList.contains('empty')) D.dispatch('#F' + f.dataset.f); });
    $pop.addEventListener('click', () => D.dispatch('#EXIT'));
    $view.addEventListener('click', e => {
      if (D.err || D.off) return;
      const a = D.cur || MENU;
      if (a.click) { try { a.click(e); } catch (er) { D.error(er); } D.render(); }
    });
    window.addEventListener('resize', () => D.render());
    D.render();
  };
})();
