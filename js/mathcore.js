/* D-Calculator — motor matemático: analisador, avaliação, formatação e métodos numéricos */
(function (G) {
  'use strict';

  const settings = { angle: 'deg', display: 'norm', digits: 4 };
  const vars = { Ans: 0 };
  for (let i = 0; i < 26; i++) vars[String.fromCharCode(65 + i)] = 0;

  class CalcError extends Error {
    constructor(kind) { super(kind); this.kind = kind; }
  }
  const fail = k => { throw new CalcError(k); };
  const isInt = n => Number.isInteger(n);

  /* ---------- funções auxiliares ---------- */
  const toRad = x => settings.angle === 'deg' ? x * Math.PI / 180 : settings.angle === 'gra' ? x * Math.PI / 200 : x;
  const fromRad = x => settings.angle === 'deg' ? x * 180 / Math.PI : settings.angle === 'gra' ? x * 200 / Math.PI : x;

  function trig(fn, x) {
    if (settings.angle !== 'rad') {
      const q = settings.angle === 'deg' ? 90 : 100, full = 4 * q;
      const m = ((x % full) + full) % full;
      if (fn === 'sin') { if (m === 0 || m === 2 * q) return 0; if (m === q) return 1; if (m === 3 * q) return -1; }
      if (fn === 'cos') { if (m === q || m === 3 * q) return 0; if (m === 0) return 1; if (m === 2 * q) return -1; }
      if (fn === 'tan') { if (m === 0 || m === 2 * q) return 0; if (m === q || m === 3 * q) return NaN; }
    }
    const r = Math[fn](toRad(x));
    return Math.abs(r) < 1e-15 ? 0 : r;
  }
  function fact(n) {
    if (n < 0 || !isInt(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  function nPr(n, r) {
    if (!isInt(n) || !isInt(r) || n < 0 || r < 0 || r > n) return NaN;
    let p = 1;
    for (let i = 0; i < r; i++) p *= n - i;
    return p;
  }
  function nCr(n, r) {
    if (!isInt(n) || !isInt(r) || n < 0 || r < 0 || r > n) return NaN;
    r = Math.min(r, n - r);
    let c = 1;
    for (let i = 1; i <= r; i++) c = c * (n - r + i) / i;
    return Math.round(c);
  }
  function gcd(a, b) {
    if (!isInt(a) || !isInt(b)) return NaN;
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  }
  const lcm = (a, b) => { const g = gcd(a, b); return isNaN(g) ? NaN : g ? Math.abs(a * b) / g : 0; };
  const mod = (a, b) => isInt(a) && isInt(b) && b !== 0 ? ((a % b) + b) % b : NaN;

  function pow(a, b) {
    if (a === 0 && b === 0) return NaN;
    if (a < 0 && !isInt(b)) {
      const fr = toFrac(b, 1000);
      if (fr && fr[1] % 2 === 1) { const r = Math.pow(-a, b); return fr[0] % 2 === 0 ? r : -r; }
      return NaN;
    }
    return Math.pow(a, b);
  }
  const xroot = (n, x) => n === 0 ? NaN : pow(x, 1 / n);

  /* ---------- tabela de funções ---------- */
  const F1 = f => ({ f, a: [1, 1] });
  const FUNCS = {
    'sin': F1(x => trig('sin', x)), 'cos': F1(x => trig('cos', x)), 'tan': F1(x => trig('tan', x)),
    'sin⁻¹': F1(x => fromRad(Math.asin(x))), 'cos⁻¹': F1(x => fromRad(Math.acos(x))), 'tan⁻¹': F1(x => fromRad(Math.atan(x))),
    'sinh': F1(Math.sinh), 'cosh': F1(Math.cosh), 'tanh': F1(Math.tanh),
    'sinh⁻¹': F1(Math.asinh), 'cosh⁻¹': F1(Math.acosh), 'tanh⁻¹': F1(Math.atanh),
    'log': { f: (a, b) => b === undefined ? Math.log10(a) : Math.log(b) / Math.log(a), a: [1, 2] },
    'ln': F1(Math.log), '√': F1(Math.sqrt), '∛': F1(Math.cbrt), 'exp': F1(Math.exp),
    'Abs': F1(Math.abs), 'Int': F1(Math.trunc), 'Intg': F1(Math.floor), 'Frac': F1(x => x - Math.trunc(x)),
    'nPr': { f: nPr, a: [2, 2] }, 'nCr': { f: nCr, a: [2, 2] },
    'gcd': { f: gcd, a: [2, 2] }, 'lcm': { f: lcm, a: [2, 2] }, 'mod': { f: mod, a: [2, 2] },
    'det': F1(x => x), 'Trn': F1(x => x)
  };
  const ALIASES = {
    asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹', asinh: 'sinh⁻¹', acosh: 'cosh⁻¹', atanh: 'tanh⁻¹',
    sqrt: '√', cbrt: '∛', abs: 'Abs', int: 'Int', frac: 'Frac', trn: 'Trn'
  };
  const CONSTS = { 'π': 'π', 'pi': 'π', 'e': 'e', 'Ran#': 'ran' };
  const SPECIAL = ['d/dx', '∫', 'Σ'];
  const NAMES = Object.keys(FUNCS).concat(Object.keys(ALIASES), Object.keys(CONSTS), SPECIAL, ['Ans', 'ans'])
    .sort((a, b) => b.length - a.length);

  const SYM = {
    '+': { type: 'op', v: '+' }, '−': { type: 'op', v: '−' }, '-': { type: 'op', v: '−' },
    '×': { type: 'op', v: '×' }, '*': { type: 'op', v: '×' }, '÷': { type: 'op', v: '÷' }, '/': { type: 'op', v: '÷' },
    '^': { type: 'op', v: '^' }, '(': { type: 'lp' }, ')': { type: 'rp' }, ',': { type: 'comma' },
    '→': { type: 'store' }, '⁻': { type: 'neg' }, '²': { type: 'post', v: '²' }, '³': { type: 'post', v: '³' },
    '!': { type: 'post', v: '!' }, '%': { type: 'post', v: '%' }, '⌟': { type: 'frac' }, '=': { type: 'eq' }
  };

  /* ---------- analisador léxico ---------- */
  function lex(s) {
    const out = [];
    const dg = ch => ch >= '0' && ch <= '9';
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      if (dg(c) || c === '.' || c === 'ᴇ') {
        let j = i, str = '';
        while (dg(s[j])) str += s[j++];
        if (s[j] === '.') { str += s[j++]; while (dg(s[j])) str += s[j++]; }
        if (str === '.' || s[j] === '.') fail('syntax');
        if (str === '') str = '1';
        if (s[j] === 'ᴇ') {
          j++;
          let sg = '';
          if (s[j] === '⁻' || s[j] === '−' || s[j] === '-') { sg = '-'; j++; } else if (s[j] === '+') j++;
          let ex = '';
          while (dg(s[j])) ex += s[j++];
          if (!ex) fail('syntax');
          str += 'e' + sg + ex;
        }
        out.push({ type: 'num', v: parseFloat(str) });
        i = j;
        continue;
      }
      let name = null;
      for (const n of NAMES) if (s.startsWith(n, i)) { name = n; break; }
      if (name) {
        i += name.length;
        const cn = ALIASES[name] || name;
        if (CONSTS[cn]) out.push({ type: 'const', v: CONSTS[cn] });
        else if (cn === 'Ans' || cn === 'ans') out.push({ type: 'var', n: 'Ans' });
        else out.push({ type: 'func', v: cn });
        continue;
      }
      if (c >= 'A' && c <= 'Z') { out.push({ type: 'var', n: c }); i++; continue; }
      if (c >= 'a' && c <= 'z') { out.push({ type: 'var', n: c.toUpperCase() }); i++; continue; }
      if (s.startsWith('⁻¹', i)) { out.push({ type: 'post', v: '⁻¹' }); i += 2; continue; }
      if (s.startsWith('ˣ√', i)) { out.push({ type: 'xroot' }); i += 2; continue; }
      const t = SYM[c];
      if (!t) fail('syntax');
      out.push(t);
      i++;
    }
    out.push({ type: 'end' });
    return out;
  }

  /* ---------- analisador sintático (descida recursiva, prioridades tipo calculadora gráfica) ---------- */
  function parse(src) {
    const t = lex(src);
    let p = 0;
    const pk = () => t[p], nx = () => t[p++];
    const isOp = (k, v) => k.type === 'op' && k.v === v;
    const startsOperand = k => k.type === 'num' || k.type === 'var' || k.type === 'const' || k.type === 'func' || k.type === 'lp';

    function expr() {
      let a = mul();
      while (isOp(pk(), '+') || isOp(pk(), '−')) { const op = nx().v; a = { t: 'bin', op, a, b: mul() }; }
      return a;
    }
    function mul() {
      let a = implicit();
      while (isOp(pk(), '×') || isOp(pk(), '÷')) { const op = nx().v; a = { t: 'bin', op, a, b: implicit() }; }
      return a;
    }
    function implicit() {           // multiplicação implícita: 2π, 3x, 2sin(x), (1)(2)
      let a = unary();
      while (startsOperand(pk())) a = { t: 'bin', op: '×', a, b: frac() };
      return a;
    }
    function unary() {
      const k = pk();
      if (k.type === 'neg' || isOp(k, '−') || isOp(k, '+')) {
        nx();
        const a = unary();
        return isOp(k, '+') ? a : { t: 'neg', a };
      }
      return frac();
    }
    function frac() {
      let a = power();
      while (pk().type === 'frac') { nx(); a = { t: 'bin', op: '÷', a, b: power() }; }
      return a;
    }
    function power() {
      let a = postfix();
      for (;;) {
        const k = pk();
        if (isOp(k, '^')) { nx(); a = { t: 'bin', op: '^', a, b: expo() }; }
        else if (k.type === 'xroot') { nx(); a = { t: 'root', n: a, a: expo() }; }
        else return a;
      }
    }
    function expo() {
      const k = pk();
      if (k.type === 'neg' || isOp(k, '−')) { nx(); return { t: 'neg', a: expo() }; }
      return power();
    }
    function postfix() {
      let a = primary();
      while (pk().type === 'post') a = { t: 'post', v: nx().v, a };
      return a;
    }
    function closeParen() {
      const k = pk();
      if (k.type === 'rp') nx();
      else if (k.type !== 'end') fail('syntax');   // parênteses finais podem ser omitidos
    }
    function tight() {              // argumento de função sem parênteses: sin 2x
      const k = pk();
      if (k.type === 'neg' || isOp(k, '−')) { nx(); return { t: 'neg', a: tight() }; }
      let a = power();
      while (['num', 'var', 'const'].includes(pk().type)) a = { t: 'bin', op: '×', a, b: power() };
      return a;
    }
    function primary() {
      const k = nx();
      switch (k.type) {
        case 'num': return { t: 'num', v: k.v };
        case 'var': return { t: 'var', n: k.n };
        case 'const': return { t: 'const', v: k.v };
        case 'lp': { const e = expr(); closeParen(); return e; }
        case 'func': {
          if (pk().type === 'lp') {
            nx();
            const args = [expr()];
            while (pk().type === 'comma') { nx(); args.push(expr()); }
            closeParen();
            return { t: 'call', f: k.v, args };
          }
          return { t: 'call', f: k.v, args: [tight()] };
        }
      }
      return fail('syntax');
    }

    let ast = expr();
    if (pk().type === 'store') {
      nx();
      const k = nx();
      if (k.type !== 'var' || k.n === 'Ans') fail('syntax');
      ast = { t: 'store', n: k.n, a: ast };
    }
    if (pk().type !== 'end') fail('syntax');
    return ast;
  }

  /* ---------- compilação para funções JS ---------- */
  function compile(n) {
    switch (n.t) {
      case 'num': { const v = n.v; return () => v; }
      case 'const': return n.v === 'π' ? () => Math.PI : n.v === 'e' ? () => Math.E : () => Math.random();
      case 'var': {
        const k = n.n;
        if (k === 'X') return s => (s && s.x !== undefined ? s.x : vars.X);
        return () => vars[k];
      }
      case 'neg': { const a = compile(n.a); return s => -a(s); }
      case 'bin': {
        const a = compile(n.a), b = compile(n.b);
        switch (n.op) {
          case '+': return s => a(s) + b(s);
          case '−': return s => a(s) - b(s);
          case '×': return s => a(s) * b(s);
          case '÷': return s => { const d = b(s); return d === 0 ? NaN : a(s) / d; };
          case '^': return s => pow(a(s), b(s));
        }
        break;
      }
      case 'root': { const r = compile(n.n), a = compile(n.a); return s => xroot(r(s), a(s)); }
      case 'post': {
        const a = compile(n.a);
        switch (n.v) {
          case '²': return s => { const v = a(s); return v * v; };
          case '³': return s => { const v = a(s); return v * v * v; };
          case '⁻¹': return s => { const v = a(s); return v === 0 ? NaN : 1 / v; };
          case '!': return s => fact(a(s));
          case '%': return s => a(s) / 100;
        }
        break;
      }
      case 'call': return compileCall(n);
      case 'store': {
        const a = compile(n.a), k = n.n;
        return s => { const v = a(s); if (isFinite(v)) vars[k] = v; return v; };
      }
    }
    return fail('syntax');
  }

  function compileCall(n) {
    const name = n.f, args = n.args;
    if (name === 'd/dx') {
      if (args.length !== 2) fail('arg');
      const f = compile(args[0]), at = compile(args[1]);
      return s => {
        const x0 = at(s), h = 1e-3 * Math.max(1, Math.abs(x0)), g = x => f({ x });
        return (-g(x0 + 2 * h) + 8 * g(x0 + h) - 8 * g(x0 - h) + g(x0 - 2 * h)) / (12 * h);
      };
    }
    if (name === '∫') {
      if (args.length !== 3) fail('arg');
      const f = compile(args[0]), a = compile(args[1]), b = compile(args[2]);
      return s => integrate(x => f({ x }), a(s), b(s));
    }
    if (name === 'Σ') {
      if (args.length !== 3) fail('arg');
      const f = compile(args[0]), a = compile(args[1]), b = compile(args[2]);
      return s => {
        const lo = a(s), hi = b(s);
        if (!isInt(lo) || !isInt(hi) || hi - lo > 1e6) return NaN;
        let sum = 0;
        for (let x = lo; x <= hi; x++) sum += f({ x });
        return sum;
      };
    }
    const def = FUNCS[name];
    if (!def) fail('syntax');
    if (args.length < def.a[0] || args.length > def.a[1]) fail('arg');
    const cs = args.map(compile), f = def.f;
    if (cs.length === 1) { const a0 = cs[0]; return s => f(a0(s)); }
    const a0 = cs[0], a1 = cs[1];
    return s => f(a0(s), a1(s));
  }

  const cache = new Map();
  function compileStr(src) {
    let f = cache.get(src);
    if (!f) {
      f = compile(parse(src));
      if (cache.size > 300) cache.clear();
      cache.set(src, f);
    }
    return f;
  }
  const clean = v => (v === 0 || !isFinite(v) ? (v === 0 ? 0 : v) : parseFloat(v.toPrecision(15)));
  function evaluate(src, scope) {
    const v = compileStr(src)(scope);
    if (typeof v !== 'number' || !isFinite(v)) fail('math');
    return clean(v);
  }

  /* ---------- métodos numéricos ---------- */
  function integrate(f, a, b) {
    if (a === b) return 0;
    let cnt = 0;
    const simp = (a, b, fa, fm, fb) => (b - a) / 6 * (fa + 4 * fm + fb);
    function rec(a, b, fa, fm, fb, whole, eps, depth) {
      const m = (a + b) / 2, flm = f((a + m) / 2), frm = f((m + b) / 2);
      cnt += 2;
      const L = simp(a, m, fa, flm, fm), R = simp(m, b, fm, frm, fb), d = L + R - whole;
      if (depth <= 0 || cnt > 2e5 || Math.abs(d) <= 15 * eps) return L + R + d / 15;
      return rec(a, m, fa, flm, fm, L, eps / 2, depth - 1) + rec(m, b, fm, frm, fb, R, eps / 2, depth - 1);
    }
    let fa = f(a), fb = f(b);
    if (!isFinite(fa)) fa = f(a + (b - a) * 1e-10);
    if (!isFinite(fb)) fb = f(b - (b - a) * 1e-10);
    const fm = f((a + b) / 2);
    return rec(a, b, fa, fm, fb, simp(a, b, fa, fm, fb), 1e-11, 45);
  }
  function bisect(f, a, b, fa) {
    for (let i = 0; i < 200; i++) {
      const m = (a + b) / 2, fm = f(m);
      if (fm === 0 || (b - a) / 2 <= 1e-15 * Math.max(1, Math.abs(m))) return m;
      if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }
  function golden(f, a, b, maximize) {
    const g = (Math.sqrt(5) - 1) / 2, F = maximize ? x => -f(x) : f;
    let c = b - g * (b - a), d = a + g * (b - a), fc = F(c), fd = F(d);
    for (let i = 0; i < 120; i++) {
      if (fc < fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = F(c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = F(d); }
    }
    return (a + b) / 2;
  }
  function sample(f, a, b, n) {
    const xs = [], ys = [];
    for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; xs.push(x); ys.push(f(x)); }
    return { xs, ys };
  }
  function findRoots(f, a, b, n = 800) {
    const { xs, ys } = sample(f, a, b, n), out = [], h = (b - a) / n;
    const add = x => { if (!out.some(r => Math.abs(r - x) < h / 2)) out.push(x); };
    for (let i = 0; i < n; i++) {
      const y0 = ys[i], y1 = ys[i + 1];
      if (!isFinite(y0) || !isFinite(y1)) continue;
      if (y0 === 0) add(xs[i]);
      else if (y0 * y1 < 0) {
        const r = bisect(f, xs[i], xs[i + 1], y0);
        if (Math.abs(f(r)) <= Math.min(Math.abs(y0), Math.abs(y1))) add(r);   // descarta assíntotas
      }
    }
    if (ys[n] === 0) add(xs[n]);
    for (let i = 1; i < n; i++) {        // raízes duplas (tangência)
      const a0 = Math.abs(ys[i - 1]), a1 = Math.abs(ys[i]), a2 = Math.abs(ys[i + 1]);
      if (a1 <= a0 && a1 < a2 && ys[i - 1] * ys[i + 1] > 0) {
        const x = golden(x => Math.abs(f(x)), xs[i - 1], xs[i + 1], false);
        if (Math.abs(f(x)) < 1e-9) add(x);
      }
    }
    return out.sort((p, q) => p - q);
  }
  function findExtrema(f, a, b, maximize, n = 800) {
    const { xs, ys } = sample(f, a, b, n), out = [];
    for (let i = 1; i < n; i++) {
      const y0 = ys[i - 1], y1 = ys[i], y2 = ys[i + 1];
      if (!isFinite(y0) || !isFinite(y1) || !isFinite(y2)) continue;
      if (!(maximize ? (y1 >= y0 && y1 > y2) : (y1 <= y0 && y1 < y2))) continue;
      // derivada numérica = 0 (mais exato que só a secção dourada)
      const der = x => { const h = 1e-6 * Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); };
      const a0 = xs[i - 1], b0 = xs[i + 1], da = der(a0), db = der(b0);
      const x = isFinite(da) && isFinite(db) && da * db < 0 ? bisect(der, a0, b0, da) : golden(f, a0, b0, maximize);
      out.push(x);
    }
    return out;
  }
  function solve(f, x0) {
    const ok = x => { const y = f(x); return isFinite(y) && Math.abs(y) < 1e-10; };
    let x = x0;
    for (let i = 0; i < 100; i++) {
      const y = f(x);
      if (!isFinite(y)) break;
      if (y === 0) return x;
      const h = 1e-7 * Math.max(1, Math.abs(x)), d = (f(x + h) - f(x - h)) / (2 * h);
      if (!isFinite(d) || d === 0) break;
      const nx = x - y / d;
      if (!isFinite(nx)) break;
      const done = Math.abs(nx - x) <= 1e-14 * Math.max(1, Math.abs(x));
      x = nx;
      if (done) break;
    }
    if (ok(x)) return x;
    let s0 = 0;
    for (let k = 0; k < 160; k++) {        // procura uma mudança de sinal cada vez mais longe
      const s1 = 0.01 * Math.pow(1.2, k);
      for (const dir of [1, -1]) {
        const a = x0 + dir * s0, b = x0 + dir * s1, fa = f(a), fb = f(b);
        if (!isFinite(fa) || !isFinite(fb)) continue;
        if (fa === 0) return a;
        if (fa * fb < 0) { const r = bisect(f, a, b, fa); if (Math.abs(f(r)) < 1e-6 * (1 + Math.abs(fa))) return r; }
      }
      s0 = s1;
    }
    return fail('nosol');
  }

  /* ---------- álgebra linear ---------- */
  function gaussJordan(m, n) {            // reduz as primeiras n colunas; false se singular
    const big = Math.max(1e-300, ...m.map(r => Math.max(...r.slice(0, n).map(Math.abs))));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
      if (Math.abs(m[p][c]) < 1e-12 * big) return false;
      [m[p], m[c]] = [m[c], m[p]];
      const pv = m[c][c];
      for (let k = c; k < m[c].length; k++) m[c][k] /= pv;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = m[r][c];
        if (f) for (let k = c; k < m[r].length; k++) m[r][k] -= f * m[c][k];
      }
    }
    return true;
  }
  const la = {
    isM: v => Array.isArray(v),
    zeros: (r, c) => Array.from({ length: r }, () => new Array(c).fill(0)),
    ident(n) { const m = la.zeros(n, n); for (let i = 0; i < n; i++) m[i][i] = 1; return m; },
    trn: A => A[0].map((_, j) => A.map(r => r[j])),
    add(A, B) {
      if (A.length !== B.length || A[0].length !== B[0].length) fail('dim');
      return A.map((r, i) => r.map((v, j) => v + B[i][j]));
    },
    scale: (k, A) => A.map(r => r.map(v => k * v)),
    mul(A, B) {
      if (A[0].length !== B.length) fail('dim');
      return A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
    },
    det(A) {
      const n = A.length;
      if (n !== A[0].length) fail('dim');
      const m = A.map(r => r.slice());
      let d = 1;
      for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
        if (m[p][c] === 0) return 0;
        if (p !== c) { [m[p], m[c]] = [m[c], m[p]]; d = -d; }
        d *= m[c][c];
        for (let r = c + 1; r < n; r++) {
          const f = m[r][c] / m[c][c];
          for (let k = c; k < n; k++) m[r][k] -= f * m[c][k];
        }
      }
      return d;
    },
    inv(A) {
      const n = A.length;
      if (n !== A[0].length) fail('dim');
      const I = la.ident(n), m = A.map((r, i) => r.concat(I[i]));
      if (!gaussJordan(m, n)) fail('math');
      return m.map(r => r.slice(n));
    },
    solve(A, b) {
      const n = A.length, m = A.map((r, i) => r.concat([b[i]]));
      return gaussJordan(m, n) ? m.map(r => r[n]) : null;
    },
    tidy(A) {
      const big = Math.max(...A.flat().map(Math.abs)) || 1;
      return A.map(r => r.map(v => (Math.abs(v) < 1e-13 * big ? 0 : clean(v))));
    }
  };

  /* ---------- formatação ---------- */
  function toFrac(x, maxDen = 1e6) {
    if (!isFinite(x)) return null;
    if (isInt(x)) return [x, 1];
    const sg = x < 0 ? -1 : 1, ax = Math.abs(x);
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = ax;
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(b), h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(ax - h1 / k1) <= 1e-14 * Math.max(1, ax)) return [sg * h1, k1];
      b = 1 / (b - a);
      if (!isFinite(b)) break;
    }
    return null;
  }
  function sci(v, sig, strip) {
    let [m, e] = v.toExponential(Math.max(0, sig - 1)).split('e');
    if (strip && m.includes('.')) m = m.replace(/\.?0+$/, '');
    const en = parseInt(e, 10);
    return m + 'ᴇ' + (en < 0 ? '−' : '+') + String(Math.abs(en)).padStart(2, '0');
  }
  function fmt(v) {
    if (typeof v !== 'number' || !isFinite(v)) return 'ERRO';
    if (v === 0) v = 0;
    const d = settings.display, n = settings.digits;
    let s;
    if (d === 'fix') s = Math.abs(v) >= 1e15 ? sci(v, 10, true) : v.toFixed(n);
    else if (d === 'sci') s = sci(v, Math.max(1, n), false);
    else {
      const p = parseFloat(v.toPrecision(10)), a = Math.abs(p);
      if (p !== 0 && (a >= 1e10 || a < 1e-9)) s = sci(v, 10, true);
      else {
        s = String(p);
        if (s.includes('e')) s = p.toFixed(Math.min(20, 9 - Math.floor(Math.log10(a)))).replace(/\.?0+$/, '');
      }
    }
    return s.replace(/^-/, '−');
  }
  function fmtShort(v, sig = 6) {
    if (v === undefined || v === null || v === '') return '';
    if (!isFinite(v)) return 'ERRO';
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e7 || a < 1e-4)) return sci(v, 3, true).replace(/^-/, '−');
    return String(parseFloat(v.toPrecision(sig))).replace(/^-/, '−');
  }
  const supE = s => s.replace(/ᴇ([−+])(\d+)/, (_, sg, d) => '×10<sup>' + (sg === '−' ? '−' : '') + Number(d) + '</sup>');
  const fmtHTML = v => supE(fmt(v));
  function fracHTML(fr) {
    if (!fr) return '';
    const [n, d] = fr;
    if (d === 1) return fmt(n);
    return (n < 0 ? '−' : '') + '<span class="fr"><span>' + Math.abs(n) + '</span><span>' + d + '</span></span>';
  }
  function numStr(v) {               // número em texto reutilizável numa expressão
    let s = String(parseFloat(v.toPrecision(12)));
    s = s.replace(/e\+?/, 'ᴇ').replace('ᴇ-', 'ᴇ⁻');
    if (s[0] === '-') s = '⁻' + s.slice(1);
    return s;
  }

  const DMath = {
    settings, vars, CalcError, FUNCS, parse, compile, compileStr, evaluate, clean, pow,
    fmt, fmtShort, fmtHTML, supE, toFrac, fracHTML, numStr,
    integrate, bisect, golden, findRoots, findExtrema, solve, la
  };
  G.DMath = DMath;
  if (typeof module !== 'undefined') module.exports = DMath;
})(typeof window !== 'undefined' ? window : globalThis);
