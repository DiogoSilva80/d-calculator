/* D-Calculator — 5: Equações (sistemas lineares, polinómios, solver) */
(function () {
  'use strict';
  const M = DMath, esc = D.esc;
  const E = () => D.data.eq || (D.data.eq = { sn: 2, sm: [[0, 0, 0], [0, 0, 0]], pn: 2, pc: [0, 0, 0], st: [], sx: 0 });
  const VN = n => (n <= 3 ? ['x', 'y', 'z'] : ['x₁', 'x₂', 'x₃', 'x₄', 'x₅', 'x₆']).slice(0, n);
  const LET = 'abcdefg';
  const SUP = ['', '', '²', '³', '⁴', '⁵', '⁶'];
  let mode = 'menu', sel = 0, res = [], fracOn = true, sEd = null, xEd = null, ssel = 0;

  /* ---------- números complexos ---------- */
  const C = (re, im = 0) => ({ re, im });
  const cadd = (a, b) => C(a.re + b.re, a.im + b.im), csub = (a, b) => C(a.re - b.re, a.im - b.im);
  const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const cabs = a => Math.hypot(a.re, a.im);
  const horner = (a, z) => a.reduce((p, k) => cadd(cmul(p, z), C(k)), C(0));

  function polyRoots(c) {
    if (c[0] === 0) throw 'O coeficiente a não pode ser 0';
    const n = c.length - 1;
    if (n === 2) {
      const [a, b, k] = c, d = b * b - 4 * a * k;
      if (d >= 0) {
        const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(d));
        const r1 = q / a, r2 = q !== 0 ? k / q : 0;
        return [C(r1), C(r2)].sort((p, s) => p.re - s.re);
      }
      const re = -b / (2 * a), im = Math.sqrt(-d) / (2 * Math.abs(a));
      return [C(re, im), C(re, -im)];
    }
    // método de Durand–Kerner
    const a = c.map(v => v / c[0]), R = 1 + Math.max(...a.slice(1).map(Math.abs));
    let z = Array.from({ length: n }, (_, k) => C(R * Math.cos(2 * Math.PI * k / n + 0.4), R * Math.sin(2 * Math.PI * k / n + 0.4)));
    for (let it = 0; it < 2000; it++) {
      let delta = 0;
      for (let i = 0; i < n; i++) {
        let den = C(1);
        for (let j = 0; j < n; j++) if (j !== i) den = cmul(den, csub(z[i], z[j]));
        const w = cdiv(horner(a, z[i]), den);
        if (isFinite(w.re) && isFinite(w.im)) { z[i] = csub(z[i], w); delta = Math.max(delta, cabs(w)); }
      }
      if (delta < 1e-15 * R) break;
    }
    // raízes múltiplas: junta as que ficaram muito próximas e usa a média
    const used = new Array(n).fill(false), out = [];
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const grp = [z[i]];
      used[i] = true;
      for (let j = i + 1; j < n; j++) if (!used[j] && cabs(csub(z[i], z[j])) < 1e-4 * Math.max(1, cabs(z[i]))) { grp.push(z[j]); used[j] = true; }
      const m = C(grp.reduce((s, q) => s + q.re, 0) / grp.length, grp.reduce((s, q) => s + q.im, 0) / grp.length);
      grp.forEach(() => out.push(m));
    }
    return out.map(r => {
      const im = Math.abs(r.im) < 1e-9 * Math.max(1, Math.abs(r.re)) ? 0 : r.im;
      const re = Math.abs(r.re) < 1e-12 * R ? 0 : r.re;
      return C(M.clean(re), M.clean(im));
    }).sort((p, q) => (!!p.im - !!q.im) || p.re - q.re || q.im - p.im);
  }

  /* ---------- apresentação ---------- */
  function val(v) {
    if (fracOn && !Number.isInteger(v) && Math.abs(v) < 1e6) { const f = M.toFrac(v, 9999); if (f) return M.fracHTML(f); }
    return M.fmtHTML(v);
  }
  function cval(z) {
    if (!z.im) return val(z.re);
    const im = Math.abs(z.im), ims = (im === 1 ? '' : M.fmtHTML(im)) + 'i';
    return z.re ? `${M.fmtHTML(z.re)} ${z.im < 0 ? '−' : '+'} ${ims}` : (z.im < 0 ? '−' : '') + ims;
  }
  const rowsHTML = rows => '<div class="res">' + rows.map(([k, v]) => `<div class="r"><b>${k}</b><span>${v}</span></div>`).join('') + '</div>';

  /* ---------- grelhas de coeficientes ---------- */
  const simGrid = new D.Grid({
    visible: 6, across: true, rows: () => E().sn, cols: () => E().sn + 1,
    head: c => (c < E().sn ? VN(E().sn)[c] : '='),
    get: (r, c) => E().sm[r][c], set: (r, c, v) => { E().sm[r][c] = v; }
  });
  const polyGrid = new D.Grid({
    visible: 1, across: true, rows: () => 1, cols: () => E().pn + 1,
    head: c => LET[c], get: (r, c) => E().pc[c], set: (r, c, v) => { E().pc[c] = v; }
  });
  function polyTemplate(n) {
    let s = '';
    for (let k = n; k >= 0; k--) s += (k < n ? '+' : '') + LET[n - k] + (k >= 2 ? 'x' + SUP[k] : k === 1 ? 'x' : '');
    return s + '=0';
  }
  function setSim(n) {
    const e = E();
    if (e.sn !== n || e.sm.length !== n) { e.sn = n; e.sm = Array.from({ length: n }, () => new Array(n + 1).fill(0)); }
    simGrid.r = simGrid.c = 0;
    mode = 'sim';
  }
  function setPoly(n) {
    const e = E();
    if (e.pn !== n || e.pc.length !== n + 1) { e.pn = n; e.pc = new Array(n + 1).fill(0); }
    polyGrid.r = polyGrid.c = 0;
    mode = 'poly';
  }
  function solveSim() {
    const e = E(), n = e.sn;
    const x = M.la.solve(e.sm.map(r => r.slice(0, n)), e.sm.map(r => r[n]));
    if (!x) throw 'Sem solução única';
    res = x.map((v, i) => [VN(n)[i], M.clean(Math.abs(v) < 1e-13 ? 0 : v)]);
    mode = 'simR';
  }
  function solverFn() {
    const parts = sEd.text.split('=');
    if (parts.length > 2 || !parts[0]) throw new M.CalcError('syntax');
    const L = M.compileStr(parts[0]), R = parts[1] ? M.compileStr(parts[1]) : () => 0;
    return { L, R, f: x => L({ x }) - R({ x }) };
  }
  function runSolver() {
    if (xEd) { if (!xEd.empty) E().sx = M.evaluate(xEd.text); xEd = null; }
    const e = E();
    e.st = sEd.t.slice();
    const { L, R, f } = solverFn();
    const x = M.clean(M.solve(f, e.sx));
    M.vars.X = x;
    res = [['x', x], ['Lft', M.clean(L({ x }))], ['Rgt', M.clean(R({ x }))]];
    mode = 'solverR';
  }

  const MENU_OPTS = ['Sistema de equações lineares', 'Equação polinomial (grau 2–6)', 'Solver (resolver f(x) = g(x))'];

  D.register('equa', {
    title: 'Equações', color: '#7b4fd6', icon: '<span style="font-size:15px">x=?</span>',
    enter() { if (!sEd) sEd = new D.Editor(E().st); },
    fkeys() {
      switch (mode) {
        case 'menu': return ['SIST', 'POLI', 'SOLVER', '', '', ''];
        case 'simN': case 'polyN': return ['2', '3', '4', '5', '6', ''];
        case 'sim': case 'poly': return ['RESOLV', 'LIMPAR', '', '', '', ''];
        case 'solver': return ['', '', '', '', '', 'RESOLV'];
        default: return ['', '', '', '', '', 'REPETIR'];
      }
    },
    render(v) {
      const e = E();
      switch (mode) {
        case 'menu':
          v.innerHTML = '<div class="opts">' + MENU_OPTS.map((t, i) => `<div class="o${i === sel ? ' sel' : ''}" data-i="${i}">F${i + 1}: ${t}</div>`).join('') + '</div>';
          return;
        case 'simN': v.innerHTML = '<div class="ttl">Sistema linear</div><div class="hint">Número de incógnitas? (F1–F5 → 2–6)</div>'; return;
        case 'polyN': v.innerHTML = '<div class="ttl">Equação polinomial</div><div class="hint">Grau? (F1–F5 → 2–6)</div>'; return;
        case 'sim': {
          const names = VN(e.sn);
          v.innerHTML = `<div class="hint">Coeficientes de ${names.join(', ')} · coluna “=” = termo independente</div><div class="${e.sn > 4 ? 'gsm' : ''}">${simGrid.html()}</div>`;
          return;
        }
        case 'poly': v.innerHTML = `<div class="hint">${esc(polyTemplate(e.pn))}</div><div class="${e.pn > 4 ? 'gsm' : ''}">${polyGrid.html()}</div>`; return;
        case 'simR': v.innerHTML = '<div class="ttl">Solução do sistema</div>' + rowsHTML(res.map(([k, x]) => [k, val(x)])); return;
        case 'polyR': v.innerHTML = `<div class="ttl">${esc(polyTemplate(e.pn))}</div>` + rowsHTML(res.map((z, i) => ['x' + '₁₂₃₄₅₆'[i], cval(z)])); return;
        case 'solver':
          v.innerHTML = '<div class="ttl">Solver — escreve a equação em x (usa SHIFT + . para “=”)</div><div class="form">' +
            `<div class="row${ssel === 0 ? ' sel' : ''}" data-i="0"><span>Eq:</span><span class="val">${ssel === 0 ? sEd.html() : D.tokHTML(sEd.t)}</span></div>` +
            `<div class="row${ssel === 1 ? ' sel' : ''}" data-i="1"><span>x inicial =</span><span class="val">${xEd ? xEd.html() : M.fmt(e.sx)}</span></div></div>`;
          return;
        case 'solverR': v.innerHTML = `<div class="ttl">${D.tokHTML(sEd.t)}</div>` + rowsHTML(res.map(([k, x]) => [k, M.fmtHTML(x)])); return;
      }
    },
    input(s) {
      if (mode === 'sim') simGrid.input(s);
      else if (mode === 'poly') polyGrid.input(s);
      else if (mode === 'solver') {
        if (ssel === 0) sEd.ins(s);
        else { if (!xEd) xEd = new D.Editor(); xEd.ins(s); }
      } else if ((mode === 'simN' || mode === 'polyN') && /^[2-6]$/.test(s)) (mode === 'simN' ? setSim : setPoly)(+s);
      else if (mode === 'menu' && /^[1-3]$/.test(s)) this.key('F' + s);
    },
    click(e) {
      const t = e.target.closest('[data-i]');
      if (mode === 'menu' && t) { sel = +t.dataset.i; this.key('EXE'); }
      else if (mode === 'sim') simGrid.click(e);
      else if (mode === 'poly') polyGrid.click(e);
      else if (mode === 'solver' && t) ssel = +t.dataset.i;
    },
    key(c) {
      const e = E();
      switch (mode) {
        case 'menu':
          if (c === 'UP') sel = (sel + 2) % 3;
          else if (c === 'DOWN') sel = (sel + 1) % 3;
          else if (c === 'EXE') this.key('F' + (sel + 1));
          else if (c === 'F1') mode = 'simN';
          else if (c === 'F2') mode = 'polyN';
          else if (c === 'F3') { mode = 'solver'; ssel = 0; }
          else if (c === 'EXIT') D.goMenu();
          return;
        case 'simN': case 'polyN':
          if (/^F[1-5]$/.test(c)) (mode === 'simN' ? setSim : setPoly)(+c[1] + 1);
          else if (c === 'EXIT') mode = 'menu';
          return;
        case 'sim': case 'poly': {
          const g = mode === 'sim' ? simGrid : polyGrid;
          if (c === 'F1') { if (g.ed) g.key('EXE'); if (mode === 'sim') solveSim(); else { res = polyRoots(e.pc.slice()); mode = 'polyR'; } return; }
          if (c === 'F2') { if (mode === 'sim') e.sm.forEach(r => r.fill(0)); else e.pc.fill(0); g.ed = null; return; }
          if (c === 'EXIT' && !g.ed) { mode = mode === 'sim' ? 'simN' : 'polyN'; return; }
          if (c === 'DEL' && !g.ed) { g.set(g.r, g.c, 0); return; }
          g.key(c);
          return;
        }
        case 'solver':
          if (c === 'F6' || (c === 'EXE' && ssel === 1 && !xEd)) { runSolver(); return; }
          if (c === 'EXIT') { if (xEd) xEd = null; else mode = 'menu'; return; }
          if (ssel === 0) {
            if (c === 'DOWN' || c === 'EXE') { ssel = 1; return; }
            sEd.key(c);
          } else {
            if (c === 'UP') { if (xEd && !xEd.empty) E().sx = M.evaluate(xEd.text); xEd = null; ssel = 0; return; }
            if (c === 'EXE') { if (!xEd.empty) e.sx = M.evaluate(xEd.text); xEd = null; return; }
            if (xEd) xEd.key(c);
            else if (c === 'LEFT' || c === 'RIGHT') xEd = new D.Editor(D.splitNum(e.sx));
          }
          return;
        default:      // ecrãs de resultados
          if (c === 'FD') fracOn = !fracOn;
          else if (c === 'F6' || c === 'EXIT') mode = { simR: 'sim', polyR: 'poly', solverR: 'solver' }[mode];
      }
    }
  });
})();
