/* D-Calculator — 3: Gráficos e 4: Tabela */
(function () {
  'use strict';
  const M = DMath, esc = D.esc;
  const COLORS = ['#1d5fd6', '#d1242f', '#1a7f37', '#c25e00', '#8250df', '#0a7f95', '#30363d'];
  const funcs = () => D.data.funcs || (D.data.funcs = Array.from({ length: 6 }, (_, i) => ({ t: [], on: true, c: i })));
  const INIT = { xmin: -6.3, xmax: 6.3, xsc: 1, ymin: -3.1, ymax: 3.1, ysc: 1 };
  const W = () => D.data.vwin || (D.data.vwin = Object.assign({}, INIT));
  D.funcs = funcs;

  function active() {
    const out = [];
    funcs().forEach((f, i) => {
      if (!f.on || !f.t.length) return;
      let g;
      try { g = M.compileStr(D.tokText(f.t)); } catch (e) { return; }
      out.push({
        i, label: 'Y' + (i + 1), toks: f.t, color: COLORS[f.c % COLORS.length],
        fn: x => { const y = g({ x }); return typeof y === 'number' ? y : NaN; }
      });
    });
    return out;
  }
  const lab = it => `<span style="color:${it.color}">${it.label}=${D.tokHTML(it.toks)}</span>`;

  /* ---------- desenho (também usado pela Estatística) ---------- */
  D.plot = function (cv, w0, items, ex) {
    ex = ex || {};
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    const dx = w0.xmax - w0.xmin, dy = w0.ymax - w0.ymin;
    const X = x => (x - w0.xmin) / dx * w, Y = y => h - (y - w0.ymin) / dy * h;
    const ax = X(0), ay = Y(0);
    g.strokeStyle = '#6b7380';
    g.lineWidth = 1;
    g.beginPath();
    if (ax >= 0 && ax <= w) { g.moveTo(ax + .5, 0); g.lineTo(ax + .5, h); }
    if (ay >= 0 && ay <= h) { g.moveTo(0, ay + .5); g.lineTo(w, ay + .5); }
    if (ay >= 0 && ay <= h && w0.xsc > 0 && dx / w0.xsc <= 120)
      for (let k = Math.ceil(w0.xmin / w0.xsc); k * w0.xsc <= w0.xmax; k++) { const p = Math.round(X(k * w0.xsc)) + .5; g.moveTo(p, ay - 2); g.lineTo(p, ay + 3); }
    if (ax >= 0 && ax <= w && w0.ysc > 0 && dy / w0.ysc <= 120)
      for (let k = Math.ceil(w0.ymin / w0.ysc); k * w0.ysc <= w0.ymax; k++) { const p = Math.round(Y(k * w0.ysc)) + .5; g.moveTo(ax - 2, p); g.lineTo(ax + 3, p); }
    g.stroke();
    for (const it of items) {
      g.strokeStyle = it.color;
      g.lineWidth = 1.7;
      g.lineJoin = 'round';
      g.beginPath();
      const N = Math.ceil(w * 2);
      let pen = false, py = 0;
      for (let i = 0; i <= N; i++) {
        const px = i * w / N, y = it.fn(w0.xmin + dx * i / N);
        if (!isFinite(y)) { pen = false; continue; }
        const sy = Math.max(-5 * h, Math.min(6 * h, Y(y)));
        const jump = pen && Math.abs(sy - py) > h && ((sy < 0 && py > h) || (sy > h && py < 0));   // assíntota
        if (pen && !jump) g.lineTo(px, sy); else g.moveTo(px, sy);
        pen = true;
        py = sy;
      }
      g.stroke();
    }
    if (ex.points) {
      g.fillStyle = ex.pointColor || '#1d5fd6';
      for (const p of ex.points) g.fillRect(X(p[0]) - 2.5, Y(p[1]) - 2.5, 5, 5);
    }
    if (ex.mark && isFinite(ex.mark.y)) {
      const mx = X(ex.mark.x), my = Y(ex.mark.y);
      g.strokeStyle = '#111';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(mx - 8, my); g.lineTo(mx + 8, my); g.moveTo(mx, my - 8); g.lineTo(mx, my + 8);
      g.stroke();
      g.beginPath();
      g.arc(mx, my, 3.5, 0, 7);
      g.stroke();
    }
  };

  /* ---------- lista de funções Y1…Y6 (partilhada por Gráficos e Tabela) ---------- */
  class FuncList {
    constructor() { this.sel = 0; this.ed = null; }
    html() {
      return '<div class="flist">' + funcs().map((f, i) => {
        const on = f.on && f.t.length ? ' class="on"' : '';
        const body = i === this.sel && this.ed ? this.ed.html() : D.tokHTML(f.t);
        return `<div class="fl${i === this.sel ? ' sel' : ''}" data-i="${i}"><span class="fn" style="--c:${COLORS[f.c % COLORS.length]}"><i${on}></i>Y${i + 1}=</span><span class="fe">${body}</span></div>`;
      }).join('') + '</div>';
    }
    input(s) { if (!this.ed) this.ed = new D.Editor(); this.ed.ins(s); }
    commit() {
      if (!this.ed) return;
      if (!this.ed.empty) M.parse(this.ed.text);       // lança Erro de Sintaxe se inválida
      const f = funcs()[this.sel];
      f.t = this.ed.t.slice();
      f.on = true;
      this.ed = null;
    }
    key(c) {
      const F = funcs(), f = F[this.sel];
      if (this.ed) {
        if (c === 'EXE' || c === 'UP' || c === 'DOWN') {
          this.commit();
          this.sel = c === 'UP' ? (this.sel + 5) % 6 : (this.sel + 1) % 6;
          return true;
        }
        if (c === 'EXIT') { this.ed = null; return true; }
        return this.ed.key(c);
      }
      switch (c) {
        case 'UP': this.sel = (this.sel + 5) % 6; return true;
        case 'DOWN': this.sel = (this.sel + 1) % 6; return true;
        case 'LEFT': case 'RIGHT': case 'EXE': this.ed = new D.Editor(f.t); return true;
        case 'F1': f.on = !f.on; return true;
        case 'F2': case 'DEL': f.t = []; return true;
        case 'F3': f.c = (f.c + 1) % COLORS.length; return true;
      }
      return false;
    }
    click(e) {
      const r = e.target.closest('[data-i]');
      if (!r) return;
      const i = +r.dataset.i;
      if (i === this.sel && !this.ed) this.ed = new D.Editor(funcs()[i].t);
      else { if (this.ed) this.commit(); this.sel = i; }
    }
  }

  /* ---------- 3: Gráficos ---------- */
  const fl = new FuncList();
  let mode = 'list', sub = '', back = 'list', sol = null;
  const tr = { k: 0, x: 0 };
  const SOLN = ['', 'RAIZ', 'MÁX', 'MÍN', 'INT-Y', 'INTSEC'];
  const vw = new D.Form([
    { label: 'Xmin', get: () => W().xmin, set: v => { W().xmin = v; } },
    { label: 'Xmax', get: () => W().xmax, set: v => { W().xmax = v; } },
    { label: 'Escala X', get: () => W().xsc, set: v => { W().xsc = Math.abs(v); } },
    { label: 'Ymin', get: () => W().ymin, set: v => { W().ymin = v; } },
    { label: 'Ymax', get: () => W().ymax, set: v => { W().ymax = v; } },
    { label: 'Escala Y', get: () => W().ysc, set: v => { W().ysc = Math.abs(v); } }
  ]);
  const setW = o => Object.assign(W(), o);
  function trigWin() {
    const a = M.settings.angle, xm = a === 'deg' ? 360 : a === 'gra' ? 400 : 2 * Math.PI;
    setW({ xmin: -xm, xmax: xm, xsc: xm / 4, ymin: -1.6, ymax: 1.6, ysc: 0.5 });
  }
  function cleanW() { const w = W(); for (const k in w) w[k] = M.clean(w[k]); }
  function pan(fx, fy) {
    const w = W(), sx = (w.xmax - w.xmin) * fx, sy = (w.ymax - w.ymin) * fy;
    w.xmin += sx; w.xmax += sx; w.ymin += sy; w.ymax += sy;
  }
  function zoom(f, cx, cy) {
    const w = W();
    if (cx === undefined) { cx = (w.xmin + w.xmax) / 2; cy = (w.ymin + w.ymax) / 2; }
    w.xmin = cx + (w.xmin - cx) * f; w.xmax = cx + (w.xmax - cx) * f;
    w.ymin = cy + (w.ymin - cy) * f; w.ymax = cy + (w.ymax - cy) * f;
    cleanW();
  }
  function checkW() {
    const w = W();
    if (!(w.xmin < w.xmax) || !(w.ymin < w.ymax)) throw 'Erro de Intervalo';
  }
  function attachPan(cv) {
    let drag = null;
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      const fx = (e.clientX - drag.x) / cv.clientWidth, fy = (e.clientY - drag.y) / cv.clientHeight;
      drag = { x: e.clientX, y: e.clientY };
      pan(-fx, fy);
      D.render();
    });
    const end = () => { if (drag) { drag = null; cv.style.cursor = ''; cleanW(); D.save(); D.render(); } };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), w = W();
      const cx = w.xmin + (e.clientX - r.left) / r.width * (w.xmax - w.xmin);
      const cy = w.ymax - (e.clientY - r.top) / r.height * (w.ymax - w.ymin);
      zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, cx, cy);
      D.render();
      D.save();
    }, { passive: false });
  }

  function runSolve(kind, k) {
    const items = active();
    if (!items.length) throw 'Sem funções ativas';
    k = ((k % items.length) + items.length) % items.length;
    const it = items[k], f = it.fn, w = W();
    let xs;
    if (kind === 1) xs = M.findRoots(f, w.xmin, w.xmax);
    else if (kind === 2 || kind === 3) xs = M.findExtrema(f, w.xmin, w.xmax, kind === 2);
    else if (kind === 4) xs = isFinite(f(0)) ? [0] : [];
    else {
      if (items.length < 2) throw 'São precisas 2 funções';
      const g = items[(k + 1) % items.length].fn;
      xs = M.findRoots(x => f(x) - g(x), w.xmin, w.xmax);
    }
    const eps = (w.xmax - w.xmin) * 1e-12;
    sol = {
      kind, k, idx: 0, it, pts: xs.map(x => {
        x = Math.abs(x) < eps ? 0 : M.clean(x);
        let y = kind === 1 ? 0 : f(x);
        if (Math.abs(y) < 1e-12) y = 0;
        return { x, y: M.clean(y) };
      })
    };
    sub = 'sol';
  }

  function drawView(v, owner) {
    let wrap = v.querySelector(`.gwrap[data-o="${owner}"]`);
    if (!wrap) {
      v.innerHTML = `<div class="gwrap" data-o="${owner}"><canvas class="gcv"></canvas><div class="gtxt"></div></div>`;
      wrap = v.firstChild;
      if (owner === 'graph') attachPan(wrap.firstChild);
    }
    return wrap;
  }

  D.register('graph', {
    title: 'Gráficos', color: '#d1452f',
    icon: '<svg viewBox="0 0 30 30" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M3 15h24M15 3v24" stroke-opacity=".55" stroke-width="1.5"/><path d="M3 25C9 25 10 5 15 5s6 20 12 20"/></svg>',
    fkeys() {
      if (mode === 'list') return ['SELEC', 'APAGAR', 'COR', 'V-WIN', '', 'TRAÇAR'];
      if (mode === 'vwin') return ['INIT', 'TRIG', 'STD', '', '', 'OK'];
      if (sub === 'gs' || sub === 'sol') return ['RAIZ', 'MÁX', 'MÍN', 'INT-Y', 'INTSEC', '◁'];
      return ['TRACE', 'ZOOM+', 'ZOOM−', 'V-WIN', 'G-SOLV', 'Y='];
    },
    render(v) {
      if (mode === 'list') { v.innerHTML = fl.html(); return; }
      if (mode === 'vwin') { v.innerHTML = '<div class="ttl">Janela de visualização (V-Window)</div>' + vw.html(); return; }
      const wrap = drawView(v, 'graph'), items = active();
      let mark = null, tl = '', bl = '';
      if (sub === 'tr' && items.length) {
        const it = items[tr.k % items.length], y = it.fn(tr.x);
        mark = { x: tr.x, y };
        tl = lab(it);
        bl = `<span>X=${M.fmt(M.clean(tr.x))}</span><span>Y=${isFinite(y) ? M.fmt(M.clean(y)) : '—'}</span>`;
      } else if (sub === 'sol' && sol) {
        tl = lab(sol.it) + ' · <b>' + SOLN[sol.kind] + '</b>';
        if (sol.pts.length) {
          const p = sol.pts[sol.idx];
          mark = p;
          bl = `<span>X=${M.fmt(p.x)}</span><span>Y=${M.fmt(p.y)}</span>` + (sol.pts.length > 1 ? `<span>${sol.idx + 1}/${sol.pts.length} ◀▶</span>` : '');
        } else bl = '<span>Não encontrado nesta janela</span>';
      } else if (sub === 'gs') tl = 'G-Solve: escolhe F1–F5';
      D.plot(wrap.firstChild, W(), items, { mark });
      wrap.lastChild.innerHTML = (tl ? `<div class="tl">${tl}</div>` : '') + (bl ? `<div class="bl">${bl}</div>` : '');
    },
    input(s) {
      if (mode === 'list') fl.input(s);
      else if (mode === 'vwin') vw.input(s);
      else if (s === '+') zoom(0.5);
      else if (s === '−') zoom(2);
    },
    click(e) { if (mode === 'list') fl.click(e); else if (mode === 'vwin') vw.click(e); },
    key(c) {
      if (mode === 'list') {
        if (c === 'F4') { fl.commit(); back = 'list'; mode = 'vwin'; return; }
        if (c === 'F6') { fl.commit(); mode = 'draw'; sub = ''; return; }
        if (fl.key(c)) return;
        if (c === 'EXIT') D.goMenu();
        return;
      }
      if (mode === 'vwin') {
        if (c === 'F1') setW(INIT);
        else if (c === 'F2') trigWin();
        else if (c === 'F3') setW({ xmin: -10, xmax: 10, xsc: 1, ymin: -10, ymax: 10, ysc: 1 });
        else if (c === 'F6' || c === 'EXIT') { vw.commit(); checkW(); mode = back; }
        else vw.key(c);
        return;
      }
      // modo de desenho
      const w = W();
      if (sub === 'gs' || sub === 'sol') {
        if (c === 'F6' || c === 'EXIT') { sub = ''; sol = null; return; }
        if (/^F[1-5]$/.test(c)) { runSolve(+c[1], sol ? sol.k : 0); return; }
        if (sub === 'sol' && sol) {
          const n = sol.pts.length;
          if (c === 'RIGHT' && n) sol.idx = (sol.idx + 1) % n;
          else if (c === 'LEFT' && n) sol.idx = (sol.idx + n - 1) % n;
          else if (c === 'UP' || c === 'DOWN') runSolve(sol.kind, sol.k + (c === 'DOWN' ? 1 : -1));
        }
        return;
      }
      if (sub === 'tr') {
        const items = active(), step = (w.xmax - w.xmin) / 126;
        if (c === 'F1' || c === 'EXIT') { sub = ''; return; }
        if (c === 'LEFT' || c === 'RIGHT') {
          tr.x = M.clean(tr.x + (c === 'RIGHT' ? step : -step));
          if (tr.x > w.xmax) { w.xmin += step; w.xmax += step; cleanW(); }
          if (tr.x < w.xmin) { w.xmin -= step; w.xmax -= step; cleanW(); }
          return;
        }
        if ((c === 'UP' || c === 'DOWN') && items.length) { tr.k = (tr.k + (c === 'DOWN' ? 1 : items.length - 1)) % items.length; return; }
        if (c === 'F6') { sub = ''; mode = 'list'; }
        return;
      }
      switch (c) {
        case 'F1':
          if (!active().length) throw 'Sem funções ativas';
          sub = 'tr'; tr.k = 0; tr.x = M.clean((w.xmin + w.xmax) / 2);
          return;
        case 'F2': zoom(0.5); return;
        case 'F3': zoom(2); return;
        case 'F4': back = 'draw'; mode = 'vwin'; return;
        case 'F5': if (!active().length) throw 'Sem funções ativas'; sub = 'gs'; return;
        case 'F6': case 'EXIT': mode = 'list'; return;
        case 'LEFT': pan(-0.1, 0); cleanW(); return;
        case 'RIGHT': pan(0.1, 0); cleanW(); return;
        case 'UP': pan(0, 0.1); cleanW(); return;
        case 'DOWN': pan(0, -0.1); cleanW(); return;
      }
    }
  });

  /* ---------- 4: Tabela ---------- */
  const fl2 = new FuncList();
  let tmode = 'list', trow = 0, ttop = 0, tcol = 0, tleft = 0;
  const TS = () => D.data.table || (D.data.table = { start: -3, end: 3, step: 1 });
  const tform = new D.Form([
    { label: 'Início', get: () => TS().start, set: v => { TS().start = v; } },
    { label: 'Fim', get: () => TS().end, set: v => { TS().end = v; } },
    { label: 'Passo', get: () => TS().step, set: v => { if (v <= 0) throw new M.CalcError('arg'); TS().step = v; } }
  ]);
  function xsList() {
    const s = TS(), out = [];
    if (!(s.step > 0) || s.end < s.start) return out;
    for (let i = 0; i < 999; i++) {
      const x = M.clean(s.start + i * s.step);
      if (x > s.end + Math.abs(s.step) * 1e-9) break;
      out.push(x);
    }
    return out;
  }
  function tableCols() {
    return [{ h: 'X', f: x => x }].concat(active().map(it => ({ h: `<span style="color:${it.color}">${it.label}</span>`, f: it.fn })));
  }

  D.register('table', {
    title: 'Tabela', color: '#1a8a4a',
    icon: '<svg viewBox="0 0 30 30" fill="none" stroke="#fff" stroke-width="2"><rect x="4" y="5" width="22" height="20" rx="2"/><path d="M4 11h22M4 18h22M13 5v20"/></svg>',
    fkeys() {
      if (tmode === 'list') return ['SELEC', 'APAGAR', 'COR', '', 'DEFINIR', 'TABELA'];
      if (tmode === 'set') return ['', '', '', '', '', 'OK'];
      return ['', '', '', '', '', 'Y='];
    },
    render(v) {
      if (tmode === 'list') { v.innerHTML = fl2.html(); return; }
      if (tmode === 'set') { v.innerHTML = '<div class="ttl">Intervalo da tabela (X)</div>' + tform.html(); return; }
      const xs = xsList(), cols = tableCols(), VR = 6, VC = 4;
      if (!xs.length) { v.innerHTML = '<div class="hint">Intervalo vazio — verifica Início, Fim e Passo.</div>'; return; }
      trow = Math.min(trow, xs.length - 1);
      tcol = Math.min(tcol, cols.length - 1);
      if (trow < ttop) ttop = trow;
      if (trow >= ttop + VR) ttop = trow - VR + 1;
      if (tcol < tleft) tleft = tcol;
      if (tcol >= tleft + VC) tleft = tcol - VC + 1;
      const vis = cols.slice(tleft, tleft + VC);
      let h = '<table class="grid"><tr><th></th>' + vis.map(c => `<th>${c.h}</th>`).join('') + '</tr>';
      for (let r = ttop; r < Math.min(xs.length, ttop + VR); r++) {
        h += `<tr><th>${r + 1}</th>`;
        vis.forEach((c, j) => {
          const sel = r === trow && tleft + j === tcol;
          h += `<td class="${sel ? 'sel' : ''}" data-r="${r}" data-c="${tleft + j}">${M.fmtShort(M.clean(c.f(xs[r])))}</td>`;
        });
        h += '</tr>';
      }
      const val = cols[tcol].f(xs[trow]);
      v.innerHTML = h + `</table><div class="cellinfo">${cols[tcol].h} = ${isFinite(val) ? M.fmtHTML(M.clean(val)) : 'ERRO'}</div>`;
    },
    input(s) { if (tmode === 'list') fl2.input(s); else if (tmode === 'set') tform.input(s); },
    click(e) {
      if (tmode === 'list') fl2.click(e);
      else if (tmode === 'set') tform.click(e);
      else { const td = e.target.closest('td[data-r]'); if (td) { trow = +td.dataset.r; tcol = +td.dataset.c; } }
    },
    key(c) {
      if (tmode === 'list') {
        if (c === 'F5') { fl2.commit(); tmode = 'set'; return; }
        if (c === 'F6') { fl2.commit(); if (!active().length) throw 'Sem funções ativas'; tmode = 'table'; trow = ttop = 0; return; }
        if (fl2.key(c)) return;
        if (c === 'EXIT') D.goMenu();
        return;
      }
      if (tmode === 'set') {
        if (c === 'F6' || c === 'EXIT') { tform.commit(); if (TS().end < TS().start) throw 'Erro de Intervalo'; tmode = 'list'; }
        else tform.key(c);
        return;
      }
      const n = xsList().length, nc = tableCols().length;
      if (c === 'UP' && trow > 0) trow--;
      else if (c === 'DOWN' && trow < n - 1) trow++;
      else if (c === 'LEFT' && tcol > 0) tcol--;
      else if (c === 'RIGHT' && tcol < nc - 1) tcol++;
      else if (c === 'F6' || c === 'EXIT') tmode = 'list';
    }
  });
})();
