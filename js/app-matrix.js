/* D-Calculator — 6: Matrizes */
(function () {
  'use strict';
  const M = DMath, la = M.la, esc = D.esc;
  const NAMES = ['A', 'B', 'C'];
  const MS = () => D.data.mats || (D.data.mats = { A: null, B: null, C: null });
  let mode = 'list', sel = 0, ans = null, out = null, fracOn = true, editing = 'A';
  const ed = new D.Editor();
  const dims = { r: 2, c: 2 };

  const dimForm = new D.Form([
    { label: 'Linhas', get: () => dims.r, set: v => { if (!Number.isInteger(v) || v < 1 || v > 6) throw new M.CalcError('dim'); dims.r = v; } },
    { label: 'Colunas', get: () => dims.c, set: v => { if (!Number.isInteger(v) || v < 1 || v > 6) throw new M.CalcError('dim'); dims.c = v; } }
  ]);
  const grid = new D.Grid({
    visible: 6, across: true,
    rows: () => MS()[editing].length, cols: () => MS()[editing][0].length,
    get: (r, c) => MS()[editing][r][c], set: (r, c, v) => { MS()[editing][r][c] = v; }
  });

  /* ---------- avaliação de expressões com matrizes ---------- */
  const num = v => { if (la.isM(v)) throw new M.CalcError('dim'); return v; };
  function mul(a, b) {
    if (la.isM(a) && la.isM(b)) return la.mul(a, b);
    if (la.isM(a)) return la.scale(b, a);
    if (la.isM(b)) return la.scale(a, b);
    return a * b;
  }
  function add(a, b, k) {
    if (la.isM(a) !== la.isM(b)) throw new M.CalcError('dim');
    return la.isM(a) ? la.add(a, k < 0 ? la.scale(-1, b) : b) : a + k * b;
  }
  function mpow(a, n) {
    if (!la.isM(a)) return M.pow(a, num(n));
    if (!Number.isInteger(n) || a.length !== a[0].length) throw new M.CalcError('arg');
    let base = n < 0 ? la.inv(a) : a, r = la.ident(a.length);
    for (let k = Math.abs(n); k > 0; k--) r = la.mul(r, base);
    return r;
  }
  function ev(n) {
    switch (n.t) {
      case 'num': return n.v;
      case 'const': return n.v === 'π' ? Math.PI : n.v === 'e' ? Math.E : Math.random();
      case 'var':
        if (n.n === 'Ans') return ans !== null ? ans : M.vars.Ans;
        if (NAMES.includes(n.n)) { const m = MS()[n.n]; if (!m) throw `Mat ${n.n} não definida`; return m; }
        return M.vars[n.n];
      case 'neg': { const a = ev(n.a); return la.isM(a) ? la.scale(-1, a) : -a; }
      case 'bin': {
        const a = ev(n.a), b = ev(n.b);
        if (n.op === '+') return add(a, b, 1);
        if (n.op === '−') return add(a, b, -1);
        if (n.op === '×') return mul(a, b);
        if (n.op === '÷') { const d = num(b); if (d === 0) throw new M.CalcError('math'); return la.isM(a) ? la.scale(1 / d, a) : a / d; }
        return mpow(a, num(b));
      }
      case 'post': {
        const a = ev(n.a);
        if (n.v === '²') return mul(a, a);
        if (n.v === '⁻¹') return la.isM(a) ? la.inv(a) : 1 / num(a);
        return M.compile({ t: 'post', v: n.v, a: { t: 'num', v: num(a) } })();
      }
      case 'root': return M.pow(num(ev(n.a)), 1 / num(ev(n.n)));
      case 'call': {
        const args = n.args.map(ev);
        if (n.f === 'det') { if (!la.isM(args[0])) return args[0]; return la.det(args[0]); }
        if (n.f === 'Trn') return la.isM(args[0]) ? la.trn(args[0]) : args[0];
        const def = M.FUNCS[n.f];
        if (!def) throw new M.CalcError('syntax');
        return def.f(...args.map(num));
      }
      case 'store': {
        const v = ev(n.a);
        if (la.isM(v)) { if (!NAMES.includes(n.n)) throw new M.CalcError('arg'); MS()[n.n] = v.map(r => r.slice()); }
        else M.vars[n.n] = v;
        return v;
      }
    }
    throw new M.CalcError('syntax');
  }
  function calc() {
    if (ed.empty) return;
    let v = ev(M.parse(ed.text));
    if (la.isM(v)) {
      if (v.flat().some(x => !isFinite(x))) throw new M.CalcError('math');
      v = la.tidy(v);
    } else {
      if (!isFinite(v)) throw new M.CalcError('math');
      v = M.clean(v);
      M.vars.Ans = v;
    }
    ans = v;
    out = { expr: ed.t.slice(), v };
  }

  /* ---------- apresentação ---------- */
  function cell(x) {
    if (fracOn && !Number.isInteger(x)) { const f = M.toFrac(x, 999); if (f) return (f[0] < 0 ? '−' : '') + Math.abs(f[0]) + '/' + f[1]; }
    return M.fmtShort(x, 7);
  }
  const matHTML = m => '<span class="matw"><table class="mat">' + m.map(r => '<tr>' + r.map(x => `<td>${cell(x)}</td>`).join('') + '</tr>').join('') + '</table></span>';
  const dimTxt = m => (m ? `${m.length}×${m[0].length}` : 'não definida');

  D.register('matrix', {
    title: 'Matrizes', color: '#0a8aa0', icon: '<span style="font-size:17px">[ ]</span>',
    fkeys() {
      if (mode === 'list') return ['EDITAR', 'DIM', 'APAGAR', '', '', 'CALC'];
      if (mode === 'dim') return ['', '', '', '', '', 'OK'];
      if (mode === 'edit') return ['', '', '', '', '', 'OK'];
      return ['A', 'B', 'C', 'det', 'Trn', 'MATS'];
    },
    render(v) {
      const ms = MS();
      if (mode === 'list') {
        v.innerHTML = '<div class="opts">' + NAMES.map((k, i) => `<div class="o${i === sel ? ' sel' : ''}" data-i="${i}" style="justify-content:space-between"><span>Mat ${k}</span><span>${dimTxt(ms[k])}</span></div>`).join('') +
          '</div><div class="hint">EXE/F1 editar · F2 dimensões · F6 calcular com as matrizes (ex.: A×B, det(A), A⁻¹)</div>';
        return;
      }
      if (mode === 'dim') { v.innerHTML = `<div class="ttl">Dimensões de Mat ${editing} (máx. 6×6)</div>` + dimForm.html(); return; }
      if (mode === 'edit') { v.innerHTML = `<div class="ttl">Mat ${editing}</div>` + grid.html(); return; }
      let h = '<div class="scroll" style="padding:2px 6px">';
      if (out) {
        h += `<div class="h-in">${D.tokHTML(out.expr)}</div><div class="mres">${la.isM(out.v) ? matHTML(out.v) : '<div class="h-out">' + (fracOn && M.toFrac(out.v, 9999) && !Number.isInteger(out.v) ? M.fracHTML(M.toFrac(out.v, 9999)) : M.fmtHTML(out.v)) + '</div>'}</div>`;
        if (la.isM(out.v)) h += '<div class="hint">Guardar: Ans→A, Ans→B ou Ans→C</div>';
      } else h += '<div class="hint">Ex.: A×B, A+B, det(A), A⁻¹, Trn(A), 2A, A², Ans→C</div>';
      v.innerHTML = h + `<div class="h-in">${ed.html()}</div></div>`;
      const sc = v.firstChild;
      sc.scrollTop = sc.scrollHeight;
    },
    input(s) {
      if (mode === 'dim') dimForm.input(s);
      else if (mode === 'edit') grid.input(s);
      else if (mode === 'calc') { if (out && ed.empty && ['+', '−', '×', '÷', '^', '²', '⁻¹', '→'].includes(s)) ed.ins('Ans'); out = out && ed.empty ? null : out; ed.ins(s); }
      else if (mode === 'list' && /^[1-3]$/.test(s)) { sel = +s - 1; this.key('F1'); }
    },
    click(e) {
      const t = e.target.closest('[data-i]');
      if (mode === 'list' && t) { if (sel === +t.dataset.i) this.key('F1'); else sel = +t.dataset.i; }
      else if (mode === 'dim') dimForm.click(e);
      else if (mode === 'edit') grid.click(e);
    },
    key(c) {
      const ms = MS();
      if (mode === 'list') {
        if (c === 'UP') sel = (sel + 2) % 3;
        else if (c === 'DOWN') sel = (sel + 1) % 3;
        else if (c === 'F1' || c === 'EXE') {
          editing = NAMES[sel];
          if (ms[editing]) { grid.r = grid.c = 0; mode = 'edit'; } else { dims.r = dims.c = 2; mode = 'dim'; }
        } else if (c === 'F2') { editing = NAMES[sel]; const m = ms[editing]; dims.r = m ? m.length : 2; dims.c = m ? m[0].length : 2; mode = 'dim'; }
        else if (c === 'F3' || c === 'DEL') ms[NAMES[sel]] = null;
        else if (c === 'F6') mode = 'calc';
        else if (c === 'EXIT') D.goMenu();
        return;
      }
      if (mode === 'dim') {
        if (c === 'F6' || (c === 'EXE' && !dimForm.ed && dimForm.sel === 1)) {
          dimForm.commit();
          const old = ms[editing], m = la.zeros(dims.r, dims.c);
          if (old) for (let r = 0; r < dims.r; r++) for (let k = 0; k < dims.c; k++) if (old[r] && old[r][k] !== undefined) m[r][k] = old[r][k];
          ms[editing] = m;
          grid.r = grid.c = 0;
          mode = 'edit';
        } else if (c === 'EXIT' && !dimForm.ed) mode = 'list';
        else dimForm.key(c);
        return;
      }
      if (mode === 'edit') {
        if ((c === 'F6' || c === 'EXIT') && !grid.ed) { mode = 'list'; return; }
        if (c === 'F6') { grid.key('EXE'); mode = 'list'; return; }
        if (c === 'DEL' && !grid.ed) { grid.set(grid.r, grid.c, 0); return; }
        grid.key(c);
        return;
      }
      // modo de cálculo
      const ins = { F1: 'A', F2: 'B', F3: 'C', F4: 'det(', F5: 'Trn(' };
      if (ins[c]) { this.input(ins[c]); return; }
      if (c === 'F6' || c === 'EXIT') { mode = 'list'; return; }
      if (c === 'EXE') { calc(); ed.clear(); return; }
      if (c === 'FD') { fracOn = !fracOn; return; }
      if (c === 'UP' && out) { ed.set(out.expr); return; }
      ed.key(c);
    }
  });
})();
