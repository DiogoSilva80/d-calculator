/* D-Calculator — 2: Estatística (listas, 1 e 2 variáveis, regressões) */
(function () {
  'use strict';
  const M = DMath;
  const L = () => D.data.lists || (D.data.lists = [[], [], []]);
  const dimErr = () => { throw new M.CalcError('dim'); };

  const grid = new D.Grid({
    visible: 6,
    rows: () => Math.max(...L().map(l => l.length)) + 1,
    cols: () => 3,
    head: c => 'Lista ' + (c + 1),
    get: (r, c) => L()[c][r],
    set: (r, c, v) => {
      const l = L()[c];
      if (r >= l.length) { l.push(v); grid.r = l.length - 1; } else l[r] = v;
    }
  });

  /* ---------- cálculos ---------- */
  const sum = a => a.reduce((s, v) => s + v, 0);
  function median(s) {
    const n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
  function basic(a) {
    const n = a.length, m = sum(a) / n, ss = sum(a.map(v => (v - m) * (v - m)));
    return { n, m, s: sum(a), s2: sum(a.map(v => v * v)), sd: Math.sqrt(ss / n), sx: n > 1 ? Math.sqrt(ss / (n - 1)) : NaN, ss };
  }
  function oneVar(a) {
    if (!a.length) dimErr();
    const b = basic(a), s = a.slice().sort((p, q) => p - q), n = s.length;
    const lo = s.slice(0, Math.floor(n / 2)), hi = s.slice(Math.ceil(n / 2));
    const freq = new Map();
    s.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
    const top = Math.max(...freq.values());
    const modes = [...freq].filter(([, f]) => f === top).map(([v]) => v);
    return [
      ['x̄', b.m], ['Σx', b.s], ['Σx²', b.s2], ['σx', b.sd], ['sx', b.sx], ['n', n],
      ['minX', s[0]], ['Q1', n > 1 ? median(lo) : s[0]], ['Med', median(s)], ['Q3', n > 1 ? median(hi) : s[0]], ['maxX', s[n - 1]],
      ['Moda', top > 1 && modes.length < n ? modes.map(M.fmt).join('; ') : 'não há'], ['Amplitude', s[n - 1] - s[0]]
    ];
  }
  function pairs() {
    const [x, y] = L();
    if (!x.length || x.length !== y.length) dimErr();
    return [x, y];
  }
  function corr(x, y) {
    const bx = basic(x), by = basic(y);
    const sxy = sum(x.map((v, i) => (v - bx.m) * (y[i] - by.m)));
    return { bx, by, sxy, r: sxy / Math.sqrt(bx.ss * by.ss) };
  }
  function twoVar() {
    const [x, y] = pairs(), c = corr(x, y);
    return [
      ['x̄', c.bx.m], ['Σx', c.bx.s], ['Σx²', c.bx.s2], ['σx', c.bx.sd], ['sx', c.bx.sx], ['n', x.length],
      ['ȳ', c.by.m], ['Σy', c.by.s], ['Σy²', c.by.s2], ['σy', c.by.sd], ['sy', c.by.sx],
      ['Σxy', sum(x.map((v, i) => v * y[i]))], ['minX', Math.min(...x)], ['maxX', Math.max(...x)],
      ['minY', Math.min(...y)], ['maxY', Math.max(...y)], ['r', c.r]
    ];
  }
  function linFit(x, y) {
    const c = corr(x, y);
    if (c.bx.ss === 0) throw new M.CalcError('math');
    const a = c.sxy / c.bx.ss;
    return { a, b: c.by.m - a * c.bx.m, r: c.r };
  }
  const n = M.numStr;
  const REG = {
    1: () => {
      const [x, y] = pairs(), f = linFit(x, y);
      return { name: 'y = ax + b', co: [['a', f.a], ['b', f.b], ['r', f.r], ['r²', f.r * f.r]], fn: t => f.a * t + f.b, ex: `${n(f.a)}x+${n(f.b)}` };
    },
    2: () => {
      const [x, y] = pairs();
      if (x.length < 3) dimErr();
      const S = k => sum(x.map(v => Math.pow(v, k))), T = k => sum(x.map((v, i) => Math.pow(v, k) * y[i]));
      const sol = M.la.solve([[S(4), S(3), S(2)], [S(3), S(2), S(1)], [S(2), S(1), x.length]], [T(2), T(1), T(0)]);
      if (!sol) throw new M.CalcError('math');
      const [a, b, c] = sol, fn = t => a * t * t + b * t + c, my = sum(y) / y.length;
      const r2 = 1 - sum(y.map((v, i) => (v - fn(x[i])) ** 2)) / sum(y.map(v => (v - my) ** 2));
      return { name: 'y = ax² + bx + c', co: [['a', a], ['b', b], ['c', c], ['R²', r2]], fn, ex: `${n(a)}x²+${n(b)}x+${n(c)}` };
    },
    3: () => {
      const [x, y] = pairs();
      if (x.some(v => v <= 0)) throw new M.CalcError('math');
      const f = linFit(x.map(Math.log), y);
      return { name: 'y = a + b·ln x', co: [['a', f.b], ['b', f.a], ['r', f.r], ['r²', f.r * f.r]], fn: t => f.b + f.a * Math.log(t), ex: `${n(f.b)}+${n(f.a)}ln(x)` };
    },
    4: () => {
      const [x, y] = pairs();
      if (y.some(v => v <= 0)) throw new M.CalcError('math');
      const f = linFit(x, y.map(Math.log)), a = Math.exp(f.b);
      return { name: 'y = a·e^(bx)', co: [['a', a], ['b', f.a], ['r', f.r], ['r²', f.r * f.r]], fn: t => a * Math.exp(f.a * t), ex: `${n(a)}e^(${n(f.a)}x)` };
    },
    5: () => {
      const [x, y] = pairs();
      if (x.some(v => v <= 0) || y.some(v => v <= 0)) throw new M.CalcError('math');
      const f = linFit(x.map(Math.log), y.map(Math.log)), a = Math.exp(f.b);
      return { name: 'y = a·x^b', co: [['a', a], ['b', f.a], ['r', f.r], ['r²', f.r * f.r]], fn: t => a * Math.pow(t, f.a), ex: `${n(a)}x^(${n(f.a)})` };
    }
  };

  /* ---------- estado da aplicação ---------- */
  let mode = 'list', rows = [], title = '', rtop = 0, reg = null, plotReg = false;
  const showRows = (t, r) => { title = t; rows = r; rtop = 0; mode = 'res'; };

  function plotWindow(x, y) {
    const pad = (lo, hi) => { const d = hi - lo || Math.abs(hi) || 1; return [lo - d * 0.12, hi + d * 0.12]; };
    const [xmin, xmax] = pad(Math.min(...x), Math.max(...x)), [ymin, ymax] = pad(Math.min(...y), Math.max(...y));
    const sc = d => Math.pow(10, Math.floor(Math.log10(d / 2)));
    return { xmin, xmax, ymin, ymax, xsc: sc(xmax - xmin), ysc: sc(ymax - ymin) };
  }

  D.register('stat', {
    title: 'Estatística', color: '#e08a1e',
    icon: '<svg viewBox="0 0 30 30" fill="#fff"><rect x="4" y="16" width="5" height="10" rx="1"/><rect x="12.5" y="8" width="5" height="18" rx="1"/><rect x="21" y="12" width="5" height="14" rx="1"/></svg>',
    fkeys() {
      if (mode === 'list') return ['GRÁF', '1-VAR', '2-VAR', 'REG', 'ORD↑', 'DEL-ALL'];
      if (mode === 'regm') return ['ax+b', 'ax²+…', 'a+b·ln', 'a·eᵇˣ', 'a·xᵇ', '◁'];
      if (mode === 'res' && reg && rows.length && title === reg.name) return ['', '', '', '', 'GRÁF', 'COPIAR'];
      return ['', '', '', '', '', '◁'];
    },
    render(v) {
      if (mode === 'list') {
        const val = L()[grid.c][grid.r];
        v.innerHTML = grid.html() + `<div class="cellinfo">Lista ${grid.c + 1}[${grid.r + 1}] = ${val === undefined ? '' : M.fmtHTML(val)}</div>`;
        return;
      }
      if (mode === 'regm') {
        v.innerHTML = '<div class="ttl">Regressão (x = Lista 1, y = Lista 2)</div><div class="hint">F1 linear · F2 quadrática · F3 logarítmica · F4 exponencial · F5 potência</div>';
        return;
      }
      if (mode === 'plot') {
        let wrap = v.querySelector('.gwrap[data-o="stat"]');
        if (!wrap) { v.innerHTML = '<div class="gwrap" data-o="stat"><canvas class="gcv"></canvas><div class="gtxt"></div></div>'; wrap = v.firstChild; }
        const [x, y] = L(), pts = x.map((t, i) => [t, y[i]]);
        const items = reg && plotReg ? [{ color: '#d1242f', fn: reg.fn }] : [];
        D.plot(wrap.firstChild, plotWindow(x, y), items, { points: pts });
        wrap.lastChild.innerHTML = reg && plotReg ? `<div class="tl" style="color:#d1242f">${reg.name}</div>` : '';
        return;
      }
      const VIS = 8;
      rtop = Math.max(0, Math.min(rtop, rows.length - VIS));
      v.innerHTML = `<div class="ttl">${title}</div><div>` + rows.slice(rtop, rtop + VIS).map(([k, val]) =>
        `<div class="r" style="display:flex;justify-content:space-between;padding:0 8px"><b>${k}</b><span>${typeof val === 'number' ? (isFinite(val) ? M.fmtHTML(val) : '—') : val}</span></div>`).join('') +
        (rows.length > VIS ? `<div class="hint" style="text-align:right">▲▼ ${rtop + 1}–${Math.min(rows.length, rtop + VIS)} de ${rows.length}</div>` : '') + '</div>';
    },
    input(s) { if (mode === 'list') grid.input(s); },
    click(e) { if (mode === 'list') grid.click(e); },
    key(c) {
      if (mode === 'list') {
        const lists = L(), cur = lists[grid.c];
        switch (c) {
          case 'F1':
            pairs();
            plotReg = false;
            mode = 'plot';
            return;
          case 'F2': showRows(`1 variável — Lista ${grid.c + 1}`, oneVar(cur)); return;
          case 'F3': showRows('2 variáveis — Lista 1 (x), Lista 2 (y)', twoVar()); return;
          case 'F4': mode = 'regm'; return;
          case 'F5': cur.sort((a, b) => a - b); return;
          case 'F6': cur.length = 0; grid.ed = null; return;
          case 'DEL':
            if (!grid.ed) { if (grid.r < cur.length) cur.splice(grid.r, 1); return; }
            break;
          case 'EXIT': if (!grid.ed) { D.goMenu(); return; } break;
        }
        grid.key(c);
        return;
      }
      if (mode === 'regm') {
        if (/^F[1-5]$/.test(c)) { reg = REG[c[1]](); showRows(reg.name, reg.co); }
        else if (c === 'F6' || c === 'EXIT') mode = 'list';
        return;
      }
      if (mode === 'plot') { if (c === 'EXIT' || c === 'F6') mode = plotReg ? 'res' : 'list'; return; }
      // resultados
      if (c === 'UP') rtop--;
      else if (c === 'DOWN') rtop++;
      else if (c === 'F5' && reg && title === reg.name) { plotReg = true; mode = 'plot'; }
      else if (c === 'F6' && reg && title === reg.name) {
        const F = D.funcs();
        let i = F.findIndex(f => !f.t.length);
        if (i < 0) i = F.length - 1;
        F[i].t = Array.from(reg.ex);
        F[i].on = true;
        throw `Copiado para Y${i + 1}`;
      } else if (c === 'EXIT' || c === 'F6') { mode = 'list'; }
    }
  });
})();
