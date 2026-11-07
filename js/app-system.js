/* D-Calculator — 7: Sistema (configuração e memória) */
(function () {
  'use strict';
  const M = DMath, S = M.settings;
  let sel = 0, confirm = false;
  const ANG = ['deg', 'rad', 'gra'], ANGL = { deg: 'Graus (Deg)', rad: 'Radianos (Rad)', gra: 'Grados (Gra)' };
  const DSP = ['norm', 'fix', 'sci'], DSPL = { norm: 'Normal', fix: 'Fixo (Fix)', sci: 'Científico (Sci)' };
  const cyc = (arr, v, d) => arr[(arr.indexOf(v) + d + arr.length) % arr.length];
  const ROWS = [
    { label: 'Ângulo', show: () => ANGL[S.angle], step: d => { S.angle = cyc(ANG, S.angle, d); }, f: ['Deg', 'Rad', 'Gra'], set: i => { S.angle = ANG[i]; } },
    { label: 'Formato', show: () => DSPL[S.display], step: d => { S.display = cyc(DSP, S.display, d); }, f: ['Norm', 'Fix', 'Sci'], set: i => { S.display = DSP[i]; } },
    { label: 'Casas (Fix/Sci)', show: () => String(S.digits), step: d => { S.digits = (S.digits + d + 10) % 10; }, f: ['−1', '+1'], set: i => { S.digits = (S.digits + (i ? 1 : -1) + 10) % 10; } },
    { label: 'Apagar toda a memória', show: () => 'EXE', step: () => { }, f: [] },
    { label: 'Sobre', show: () => 'D-Calculator 1.0', step: () => { }, f: [] }
  ];

  D.register('system', {
    title: 'Sistema', color: '#56606e',
    icon: '<svg viewBox="0 0 30 30" fill="none" stroke="#fff" stroke-width="2.4"><circle cx="15" cy="15" r="4.5"/><path d="M15 3v4M15 23v4M3 15h4M23 15h4M6.5 6.5l2.8 2.8M20.7 20.7l2.8 2.8M6.5 23.5l2.8-2.8M20.7 9.3l2.8-2.8" stroke-linecap="round"/></svg>',
    enter() { confirm = false; },
    fkeys() {
      if (confirm) return ['SIM', '', '', '', '', 'NÃO'];
      return ROWS[sel].f.slice();
    },
    render(v) {
      if (confirm) {
        v.innerHTML = '<div class="ttl">Apagar toda a memória?</div><div class="hint">Apaga variáveis, funções, listas, matrizes e configuração. F1 = Sim, F6 = Não.</div>';
        return;
      }
      v.innerHTML = '<div class="form">' + ROWS.map((r, i) =>
        `<div class="row${i === sel ? ' sel' : ''}" data-i="${i}"><span>${r.label}</span><span class="val">${r.show()}${i === sel && i < 3 ? ' ◀▶' : ''}</span></div>`).join('') +
        '</div><div class="hint">◀▶ ou F1–F3 mudam o valor · SHIFT+MENU abre este ecrã</div>';
    },
    click(e) { const r = e.target.closest('[data-i]'); if (r && !confirm) sel = +r.dataset.i; },
    key(c) {
      if (confirm) {
        if (c === 'F1') D.reset();
        else if (c === 'F6' || c === 'EXIT') confirm = false;
        return;
      }
      const r = ROWS[sel];
      if (c === 'UP') sel = (sel + ROWS.length - 1) % ROWS.length;
      else if (c === 'DOWN') sel = (sel + 1) % ROWS.length;
      else if (c === 'LEFT' || c === 'RIGHT') r.step(c === 'RIGHT' ? 1 : -1);
      else if (c === 'EXE') { if (sel === 3) confirm = true; else r.step(1); }
      else if (/^F[1-6]$/.test(c) && r.set && +c[1] <= r.f.length) r.set(+c[1] - 1);
      else if (c === 'EXIT') D.goMenu();
    }
  });
})();
