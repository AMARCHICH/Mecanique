import { SimulationConfig, drawArrow, drawSpring, drawBackground, drawGround, drawSupport } from './core';

// Shared equilibrium detector for damped oscillators
function oscillatorEquilibrium(y: number[], p: Record<string, number>, t: number): boolean {
  if (t < 1) return false;
  if ((p.b ?? 0) <= 0 && (p.beta ?? 0) <= 0) return false;
  return Math.abs(y[0]) < 0.005 && Math.abs(y[1]) < 0.005;
}

// ============================================================
// 1. PENDULE SIMPLE
// ============================================================
const simplePendulum: SimulationConfig = {
  id: 'simple-pendulum',
  name: 'Pendule simple',
  icon: '🔄',
  description: 'Oscillations du pendule simple avec amortissement',
  category: 'Oscillations mécaniques',
  parameters: [
    { key: 'L', label: 'Longueur L', unit: 'm', min: 0.1, max: 5, step: 0.1, default: 1.0 },
    { key: 'm', label: 'Masse m', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1.0 },
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'b', label: 'Amortissement b', unit: 'kg·m²/s', min: 0, max: 2, step: 0.01, default: 0.0 },
    { key: 'theta0', label: 'Angle initial θ₀', unit: '°', min: -179, max: 179, step: 1, default: 30 },
    { key: 'omega0', label: 'Vit. ang. initiale ω₀', unit: 'rad/s', min: -10, max: 10, step: 0.1, default: 0 },
  ],
  stateLabels: ['θ (rad)', 'ω (rad/s)'],
  getInitialState: (p) => [p.theta0 * Math.PI / 180, p.omega0],
  derivatives: (_t, y, p) => {
    const [theta, omega] = y;
    return [omega, -(p.g / p.L) * Math.sin(theta) - (p.b / (p.m * p.L * p.L)) * omega];
  },
  computeDerivedQuantities: (_t, y, p) => {
    const [theta, omega] = y;
    const Ek = 0.5 * p.m * p.L * p.L * omega * omega;
    const Ep = p.m * p.g * p.L * (1 - Math.cos(theta));
    return {
      theta, omega,
      x: p.L * Math.sin(theta), y_pos: -p.L * Math.cos(theta),
      vx: p.L * omega * Math.cos(theta), vy: p.L * omega * Math.sin(theta),
      Ek, Ep, Em: Ek + Ep,
      tension: p.m * p.g * Math.cos(theta) + p.m * p.L * omega * omega,
      alpha: -(p.g / p.L) * Math.sin(theta) - (p.b / (p.m * p.L * p.L)) * omega,
    };
  },
  graphGroups: [
    { type: 'time', title: 'Angle θ(t)', traces: [{ key: 'theta', label: 'θ (rad)', color: '#3B82F6' }], yLabel: 'θ (rad)' },
    { type: 'time', title: 'Vitesse angulaire ω(t)', traces: [{ key: 'omega', label: 'ω (rad/s)', color: '#8B5CF6' }], yLabel: 'ω (rad/s)' },
    { type: 'time', title: 'Accélération α(t)', traces: [{ key: 'alpha', label: 'α (rad/s²)', color: '#EC4899' }], yLabel: 'α (rad/s²)' },
    { type: 'time', title: 'Énergie', traces: [
      { key: 'Ek', label: 'Ek (J)', color: '#EF4444' },
      { key: 'Ep', label: 'Ep (J)', color: '#3B82F6' },
      { key: 'Em', label: 'Em (J)', color: '#10B981' },
    ], yLabel: 'Énergie (J)' },
    { type: 'phase', title: 'Phase (θ, ω)', xKey: 'theta', xLabel: 'θ (rad)', yKey: 'omega', yLabel: 'ω (rad/s)', color: '#F59E0B' },
  ],
  renderAnimation: (ctx, y, p, t, w, h, _hist) => {
    const [theta, omega] = y;
    drawBackground(ctx, w, h);
    const scale = Math.min(w, h) * 0.3 / Math.max(p.L, 0.1);
    const px = w / 2, py = h * 0.18;
    const bx = px + p.L * scale * Math.sin(theta);
    const by = py + p.L * scale * Math.cos(theta);
    const br = Math.max(8, Math.min(22, 5 + p.m * 2.5));
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + p.L * scale + 20); ctx.stroke();
    ctx.setLineDash([]);
    if (Math.abs(theta) > 0.02) {
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
      ctx.beginPath();
      const aR = Math.min(50, p.L * scale * 0.3);
      if (theta > 0) ctx.arc(px, py, aR, Math.PI / 2, Math.PI / 2 + theta, false);
      else ctx.arc(px, py, aR, Math.PI / 2 + theta, Math.PI / 2, false);
      ctx.stroke();
      ctx.fillStyle = '#F59E0B'; ctx.font = '13px serif';
      const la = Math.PI / 2 + theta / 2;
      ctx.fillText('θ', px + (aR + 14) * Math.cos(la), py + (aR + 14) * Math.sin(la));
    }
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = '#3B82F6'; ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('m', bx, by);
    drawSupport(ctx, px, py);
    const fScale = scale * 0.15;
    const gF = p.m * p.g * fScale;
    drawArrow(ctx, bx, by, bx, by + gF, '#EF4444', 2.5);
    ctx.fillStyle = '#EF4444'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('P=mg', bx + 8, by + gF);
    const tens = (p.m * p.g * Math.cos(theta) + p.m * p.L * omega * omega);
    const tLen = Math.abs(tens) * fScale / (p.m * p.g);
    if (tLen > 3) {
      const s = tens > 0 ? 1 : -1;
      const tdx = -Math.sin(theta) * tLen * s;
      const tdy = -Math.cos(theta) * tLen * s;
      drawArrow(ctx, bx, by, bx + tdx, by + tdy, '#10B981', 2.5);
      ctx.fillStyle = '#10B981'; ctx.fillText('T', bx + tdx - 14, by + tdy);
    }
    const vLen = omega * p.L * scale * 0.12;
    if (Math.abs(vLen) > 2) {
      const vdx = vLen * Math.cos(theta);
      const vdy = -vLen * Math.sin(theta);
      drawArrow(ctx, bx, by, bx + vdx, by + vdy, '#8B5CF6', 2);
      ctx.fillStyle = '#8B5CF6'; ctx.fillText('v', bx + vdx + 5, by + vdy);
    }
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  isEquilibrium: oscillatorEquilibrium,
  equations: [
    { label: 'Éq. différentielle', text: 'd²θ/dt² = -(g/L)·sin(θ) - (b/mL²)·dθ/dt' },
    { label: 'Période (petits angles)', text: 'T₀ = 2π·√(L/g)' },
    { label: 'Énergie cinétique', text: 'Ek = ½·m·L²·ω²' },
    { label: 'Énergie potentielle', text: 'Ep = m·g·L·(1 - cos θ)' },
    { label: 'Tension du fil', text: 'T = m·g·cos θ + m·L·ω²' },
  ],
  computeResults: (p, y) => {
    const [theta, omega] = y;
    const T0 = 2 * Math.PI * Math.sqrt(p.L / p.g);
    const Ek = 0.5 * p.m * p.L * p.L * omega * omega;
    const Ep = p.m * p.g * p.L * (1 - Math.cos(theta));
    return [
      { label: 'Période T₀', value: T0.toFixed(4), unit: 's' },
      { label: 'Fréquence f₀', value: (1 / T0).toFixed(4), unit: 'Hz' },
      { label: 'Angle θ', value: theta.toFixed(4), unit: 'rad' },
      { label: 'Angle θ', value: (theta * 180 / Math.PI).toFixed(2), unit: '°' },
      { label: 'Vit. angulaire ω', value: omega.toFixed(4), unit: 'rad/s' },
      { label: 'Ek', value: Ek.toFixed(4), unit: 'J' },
      { label: 'Ep', value: Ep.toFixed(4), unit: 'J' },
      { label: 'Em', value: (Ek + Ep).toFixed(4), unit: 'J' },
    ];
  },
};

// ============================================================
// 2-6. [Autres simulations inchangées — gardez votre code existant]
// ============================================================
const compoundPendulum: SimulationConfig = { /* ... votre code existant ... */ } as any;
const springVertical: SimulationConfig = { /* ... */ } as any;
const springHorizontal: SimulationConfig = { /* ... */ } as any;
const springInclined: SimulationConfig = { /* ... */ } as any;
const torsionPendulum: SimulationConfig = { /* ... */ } as any;

// ============================================================
// 7. CHUTE LIBRE (MODIFIÉE — Objets dynamiques)
// ============================================================
const OBJ_COLORS_FF = ['#EF4444', '#3B82F6', '#10B981'];
const OBJ_NAMES_FF = ['Objet 1', 'Objet 2', 'Objet 3'];

const freeFall: SimulationConfig = {
  id: 'freefall',
  name: 'Chute libre',
  icon: '⬇️',
  description: 'Chute libre sans frottement — expérience de Galilée : tous les objets tombent à la même vitesse. Ajoutez des objets pour comparer !',
  category: 'Chute et projectile',

  defaultObjectCount: 1,
  maxObjectCount: 3,

  parameters: [
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'h0', label: 'Hauteur initiale h₀', unit: 'm', min: 1, max: 500, step: 1, default: 100 },
    { key: 'm_0', label: '● Masse (Objet 1)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    { key: 'm_1', label: '● Masse (Objet 2)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 5.0 },
    { key: 'm_2', label: '● Masse (Objet 3)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 50.0 },
  ],

  stateLabels: ['y₀', 'vy₀', 'y₁', 'vy₁', 'y₂', 'vy₂'],
  getInitialState: () => [0, 0, 0, 0, 0, 0],

  derivatives: (_t, y, p) => {
    const dydt: number[] = [];
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < 3; i++) {
      if (i >= n) { dydt.push(0, 0); continue; }
      const yi = y[i * 2];
      const vyi = y[i * 2 + 1];
      if (yi >= p.h0) { dydt.push(0, 0); continue; }
      dydt.push(vyi, p.g);
    }
    return dydt;
  },

  postStep: (y, p) => {
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      if (y[i * 2] > p.h0) { y[i * 2] = p.h0; y[i * 2 + 1] = 0; }
    }
  },

  isEquilibrium: (y, p, t) => {
    if (t < 0.5) return false;
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) { if (y[i * 2] < p.h0 - 0.01) return false; }
    return true;
  },

  computeDerivedQuantities: (_t, y, p) => {
    const d: Record<string, number> = {};
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      const yi = y[i * 2], vyi = y[i * 2 + 1], m = p[`m_${i}`];
      const h = Math.max(0, p.h0 - yi);
      const landed = yi >= p.h0 - 0.001;
      d[`y_${i}`] = h;
      d[`vy_${i}`] = landed ? 0 : vyi;
      d[`a_${i}`] = landed ? 0 : p.g;
      d[`Ek_${i}`] = landed ? 0 : 0.5 * m * vyi * vyi;
      d[`Ep_${i}`] = m * p.g * h;
      d[`Em_${i}`] = d[`Ek_${i}`] + d[`Ep_${i}`];
    }
    return d;
  },

  graphGroups: [
    { type: 'time', title: 'Hauteur y(t)', traces: [0, 1, 2].map(i => ({ key: `y_${i}`, label: OBJ_NAMES_FF[i], color: OBJ_COLORS_FF[i] })), yLabel: 'y (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [0, 1, 2].map(i => ({ key: `vy_${i}`, label: OBJ_NAMES_FF[i], color: OBJ_COLORS_FF[i] })), yLabel: 'v (m/s)' },
    { type: 'time', title: 'Accélération a(t)', traces: [0, 1, 2].map(i => ({ key: `a_${i}`, label: OBJ_NAMES_FF[i], color: OBJ_COLORS_FF[i] })), yLabel: 'a (m/s²)' },
    { type: 'time', title: 'Énergie', traces: [0, 1, 2].flatMap(i => [
      { key: `Ek_${i}`, label: `Ek ${i + 1}`, color: OBJ_COLORS_FF[i] },
      { key: `Ep_${i}`, label: `Ep ${i + 1}`, color: OBJ_COLORS_FF[i] + '80' },
    ]), yLabel: 'Énergie (J)' },
  ],

  renderAnimation: (ctx, y, p, t, w, h) => {
    drawBackground(ctx, w, h);
    const n = p.numberOfObjects ?? 1;
    const infoY = 18, startY = 72, groundY = h * 0.82, topY = startY;
    const scale = (groundY - topY) / Math.max(p.h0, 1);
    const spacing = (w - 80) / Math.max(n, 1);
    drawGround(ctx, groundY, w);
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    for (let hh = 0; hh <= p.h0; hh += Math.max(1, Math.floor(p.h0 / 5))) {
      const yy = groundY - hh * scale;
      if (yy < topY) break;
      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(30, yy); ctx.lineTo(w - 10, yy); ctx.stroke();
      ctx.fillText(`${hh}`, 28, yy + 3);
    }
    for (let i = 0; i < n; i++) {
      const yi = y[i * 2], vyi = y[i * 2 + 1], hi = Math.max(0, p.h0 - yi);
      const objX = 40 + spacing * i + spacing / 2;
      const objY = groundY - hi * scale;
      const col = OBJ_COLORS_FF[i];
      ctx.strokeStyle = col + '40'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(objX, topY); ctx.lineTo(objX, objY); ctx.stroke();
      const radius = Math.max(12, Math.min(22, 10 + Math.log(p[`m_${i}`] + 1) * 4));
      ctx.fillStyle = col; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(objX, objY, radius, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(OBJ_NAMES_FF[i], objX, infoY);
      ctx.font = '11px sans-serif';
      ctx.fillText(`${p[`m_${i}`].toFixed(1)} kg`, objX, infoY + 16);
      ctx.fillStyle = '#374151'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`h=${hi.toFixed(1)} m`, objX + radius + 10, objY);
      const vScale = scale * 0.15, vLen = vyi * vScale;
      if (Math.abs(vLen) > 3) {
        drawArrow(ctx, objX + radius + 5, objY, objX + radius + 5, objY + Math.min(vLen, groundY - objY - 5), col, 2);
      }
    }
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 14);
    ctx.textAlign = 'left';
  },

  equations: [
    { label: 'Équation', text: 'd²y/dt² = g (identique pour tous les objets)' },
    { label: 'Galilée', text: 'Dans le vide, la masse n'influence pas la chute' },
    { label: 'Hauteur', text: 'h(t) = h₀ − ½·g·t²' },
    { label: 'Vitesse', text: 'v(t) = g·t' },
  ],

  computeResults: (p, y) => {
    const results: { label: string; value: string; unit: string }[] = [];
    const n = p.numberOfObjects ?? 1;
    const tFall = Math.sqrt((2 * p.h0) / p.g);
    const vImpact = p.g * tFall;
    results.push(
      { label: 'Durée de chute', value: tFall.toFixed(3), unit: 's' },
      { label: 'Vitesse d'impact', value: vImpact.toFixed(2), unit: 'm/s' },
    );
    for (let i = 0; i < n; i++) {
      const vyi = y[i * 2 + 1], m = p[`m_${i}`];
      results.push(
        { label: `Vitesse ${i + 1}`, value: vyi.toFixed(2), unit: 'm/s' },
        { label: `Ek ${i + 1}`, value: (0.5 * m * vyi * vyi).toFixed(2), unit: 'J' },
      );
    }
    return results;
  },
};

// ============================================================
// 8. CHUTE DANS UN FLUIDE (MODIFIÉE)
// ============================================================
const OBJ_COLORS_FL = ['#EF4444', '#3B82F6', '#10B981'];
const OBJ_NAMES_FL = ['Objet 1', 'Objet 2', 'Objet 3'];

const fluidFall: SimulationConfig = {
  id: 'fluid-fall',
  name: 'Chute dans un fluide',
  icon: '💧',
  description: 'Chute avec frottements fluides — comparaison de plusieurs objets',
  category: 'Chute et projectile',
  defaultObjectCount: 1,
  maxObjectCount: 3,
  parameters: [
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'h0', label: 'Hauteur initiale h₀', unit: 'm', min: 1, max: 500, step: 1, default: 100 },
    { key: 'rho', label: 'Masse vol. fluide ρ', unit: 'kg/m³', min: 0.1, max: 1500, step: 0.1, default: 1.22 },
    { key: 'm_0', label: '● Masse (Objet 1)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    { key: 'A_0', label: '● Surface (Objet 1)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.01 },
    { key: 'Cd_0', label: '● Coeff. traînée (Objet 1)', unit: '', min: 0, max: 2, step: 0.01, default: 0.47 },
    { key: 'm_1', label: '● Masse (Objet 2)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 5.0 },
    { key: 'A_1', label: '● Surface (Objet 2)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.03 },
    { key: 'Cd_1', label: '● Coeff. traînée (Objet 2)', unit: '', min: 0, max: 2, step: 0.01, default: 0.47 },
    { key: 'm_2', label: '● Masse (Objet 3)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 0.1 },
    { key: 'A_2', label: '● Surface (Objet 3)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.05 },
    { key: 'Cd_2', label: '● Coeff. traînée (Objet 3)', unit: '', min: 0, max: 2, step: 0.01, default: 1.0 },
  ],
  stateLabels: ['y₀', 'vy₀', 'y₁', 'vy₁', 'y₂', 'vy₂'],
  getInitialState: () => [0, 0, 0, 0, 0, 0],
  derivatives: (_t, y, p) => {
    const dydt: number[] = [];
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < 3; i++) {
      if (i >= n) { dydt.push(0, 0); continue; }
      const yi = y[i * 2], vyi = y[i * 2 + 1];
      if (yi >= p.h0) { dydt.push(0, 0); continue; }
      dydt.push(vyi);
      const m = p[`m_${i}`], A = p[`A_${i}`], Cd = p[`Cd_${i}`];
      const a = p.g - (0.5 * p.rho * Cd * A * vyi * Math.abs(vyi)) / Math.max(m, 0.001);
      dydt.push(a);
    }
    return dydt;
  },
  postStep: (y, p) => {
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      if (y[i * 2] > p.h0) { y[i * 2] = p.h0; y[i * 2 + 1] = 0; }
    }
  },
  isEquilibrium: (y, p, t) => {
    if (t < 0.5) return false;
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) { if (y[i * 2] < p.h0 - 0.01) return false; }
    return true;
  },
  computeDerivedQuantities: (_t, y, p) => {
    const d: Record<string, number> = {};
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      const yi = y[i * 2], vyi = y[i * 2 + 1];
      const m = p[`m_${i}`], A = p[`A_${i}`], Cd = p[`Cd_${i}`];
      const h = Math.max(0, p.h0 - yi);
      const landed = yi >= p.h0 - 0.001;
      const vLim = Math.sqrt(2 * m * p.g / (p.rho * Cd * Math.max(A, 0.001)));
      const drag = 0.5 * p.rho * Cd * A * vyi * Math.abs(vyi);
      d[`y_${i}`] = h;
      d[`vy_${i}`] = landed ? 0 : vyi;
      d[`a_${i}`] = landed ? 0 : p.g - drag / Math.max(m, 0.001);
      d[`Ek_${i}`] = landed ? 0 : 0.5 * m * vyi * vyi;
      d[`Ep_${i}`] = m * p.g * h;
      d[`Em_${i}`] = d[`Ek_${i}`] + d[`Ep_${i}`];
      d[`v_lim_${i}`] = vLim;
      d[`drag_${i}`] = landed ? 0 : drag;
    }
    return d;
  },
  graphGroups: [
    { type: 'time', title: 'Hauteur y(t)', traces: [0, 1, 2].map(i => ({ key: `y_${i}`, label: OBJ_NAMES_FL[i], color: OBJ_COLORS_FL[i] })), yLabel: 'y (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [0, 1, 2].map(i => ({ key: `vy_${i}`, label: OBJ_NAMES_FL[i], color: OBJ_COLORS_FL[i] })), yLabel: 'v (m/s)' },
    { type: 'time', title: 'Vitesse limite', traces: [0, 1, 2].map(i => ({ key: `v_lim_${i}`, label: `v_lim ${i + 1}`, color: OBJ_COLORS_FL[i] })), yLabel: 'v_lim (m/s)', positiveY: true },
    { type: 'time', title: 'Force de traînée', traces: [0, 1, 2].map(i => ({ key: `drag_${i}`, label: `F_d ${i + 1}`, color: OBJ_COLORS_FL[i] })), yLabel: 'F_d (N)', positiveY: true },
    { type: 'time', title: 'Énergie', traces: [0, 1, 2].flatMap(i => [
      { key: `Ek_${i}`, label: `Ek ${i + 1}`, color: OBJ_COLORS_FL[i] },
      { key: `Ep_${i}`, label: `Ep ${i + 1}`, color: OBJ_COLORS_FL[i] + '80' },
    ]), yLabel: 'Énergie (J)' },
  ],
  renderAnimation: (ctx, y, p, t, w, h) => {
    drawBackground(ctx, w, h);
    const n = p.numberOfObjects ?? 1;
    const titleY = 14, infoY = 34, startY = 78, groundY = h * 0.85, topY = startY;
    const scale = (groundY - topY) / Math.max(p.h0, 1);
    const spacing = (w - 40) / Math.max(n, 1);
    drawGround(ctx, groundY, w);
    ctx.fillStyle = 'rgba(147, 197, 253, 0.08)';
    ctx.fillRect(0, topY, w, groundY - topY);
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    for (let hh = 0; hh <= p.h0; hh += Math.max(1, Math.floor(p.h0 / 5))) {
      const yy = groundY - hh * scale;
      if (yy < topY) break;
      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(30, yy); ctx.lineTo(w - 10, yy); ctx.stroke();
      ctx.fillText(`${hh}`, 28, yy + 3);
    }
    ctx.fillStyle = '#0EA5E9'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Chute dans un fluide (ρ = ${p.rho.toFixed(2)} kg/m³)`, w / 2, titleY);
    for (let i = 0; i < n; i++) {
      const yi = y[i * 2], vyi = y[i * 2 + 1], hi = Math.max(0, p.h0 - yi);
      const objX = 50 + spacing * i + spacing / 2;
      const objY = groundY - hi * scale;
      const col = OBJ_COLORS_FL[i];
      ctx.strokeStyle = col + '40'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(objX, topY); ctx.lineTo(objX, objY); ctx.stroke();
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
      const ms = Math.max(10, Math.min(20, 8 + Math.log(p[`m_${i}`] + 1) * 5));
      ctx.beginPath(); ctx.arc(objX, objY, ms, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(OBJ_NAMES_FL[i], objX, infoY);
      const vScale = scale * 0.15, vLen = vyi * vScale;
      if (Math.abs(vLen) > 3) {
        drawArrow(ctx, objX + ms + 5, objY, objX + ms + 5, objY + Math.min(vLen, groundY - objY - 5), col, 2);
      }
      const m = p[`m_${i}`], A = p[`A_${i}`], Cd = p[`Cd_${i}`];
      const dragForce = 0.5 * p.rho * Cd * A * vyi * Math.abs(vyi);
      const dragLen = dragForce / (m * p.g) * p.g * vScale * 0.5;
      if (dragLen > 3) {
        drawArrow(ctx, objX - ms - 5, objY, objX - ms - 5, objY - Math.min(dragLen, 50), '#F97316', 2);
      }
    }
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  equations: [
    { label: 'Avec frottements', text: 'm·d²y/dt² = m·g - ½·ρ·Cd·A·v·|v|' },
    { label: 'Vitesse limite', text: 'v_lim = √(2mg / (ρ·Cd·A))' },
    { label: 'Force de traînée', text: 'F_d = ½·ρ·Cd·A·v²' },
  ],
  computeResults: (p, y) => {
    const results: { label: string; value: string; unit: string }[] = [];
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      const vyi = y[i * 2 + 1], m = p[`m_${i}`], A = p[`A_${i}`], Cd = p[`Cd_${i}`];
      const vLim = Math.sqrt(2 * m * p.g / (p.rho * Cd * Math.max(A, 0.001)));
      results.push(
        { label: `Vitesse ${i + 1}`, value: vyi.toFixed(2), unit: 'm/s' },
        { label: `V. limite ${i + 1}`, value: vLim.toFixed(2), unit: 'm/s' },
        { label: `Ek ${i + 1}`, value: (0.5 * m * vyi * vyi).toFixed(2), unit: 'J' },
      );
    }
    return results;
  },
};

// ============================================================
// 9. PROJECTILE (MODIFIÉ)
// ============================================================
const OBJ_COLORS_PJ = ['#EF4444', '#3B82F6', '#10B981'];
const OBJ_NAMES_PJ = ['Projectile 1', 'Projectile 2', 'Projectile 3'];

const projectile: SimulationConfig = {
  id: 'projectile',
  name: 'Mouvement de projectile',
  icon: '🎯',
  description: 'Trajectoire de plusieurs projectiles',
  category: 'Chute et projectile',
  defaultObjectCount: 1,
  maxObjectCount: 3,
  parameters: [
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'm_0', label: '● Masse (Proj. 1)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    { key: 'v0_0', label: '● Vitesse init. (Proj. 1)', unit: 'm/s', min: 1, max: 100, step: 1, default: 30 },
    { key: 'alpha_0', label: '● Angle (Proj. 1)', unit: '°', min: 1, max: 89, step: 1, default: 45 },
    { key: 'm_1', label: '● Masse (Proj. 2)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    { key: 'v0_1', label: '● Vitesse init. (Proj. 2)', unit: 'm/s', min: 1, max: 100, step: 1, default: 30 },
    { key: 'alpha_1', label: '● Angle (Proj. 2)', unit: '°', min: 1, max: 89, step: 1, default: 60 },
    { key: 'm_2', label: '● Masse (Proj. 3)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 0.5 },
    { key: 'v0_2', label: '● Vitesse init. (Proj. 2)', unit: 'm/s', min: 1, max: 100, step: 1, default: 30 },
    { key: 'alpha_2', label: '● Angle (Proj. 3)', unit: '°', min: 1, max: 89, step: 1, default: 30 },
  ],
  stateLabels: ['x₀', 'y₀', 'vx₀', 'vy₀', 'x₁', 'y₁', 'vx₁', 'vy₁', 'x₂', 'y₂', 'vx₂', 'vy₂'],
  getInitialState: (p) => {
    const s: number[] = [];
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < 3; i++) {
      if (i >= n) { s.push(0, 0, 0, 0); continue; }
      const a = (p[`alpha_${i}`] || 45) * Math.PI / 180;
      const v0 = p[`v0_${i}`] || 30;
      s.push(0, 0, v0 * Math.cos(a), v0 * Math.sin(a));
    }
    return s;
  },
  derivatives: (_t, y, p) => {
    const dydt: number[] = [];
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < 3; i++) {
      if (i >= n) { dydt.push(0, 0, 0, 0); continue; }
      const yi = y[i * 4 + 1], vxi = y[i * 4 + 2], vyi = y[i * 4 + 3];
      if (yi <= 0 && vyi <= 0) { dydt.push(0, 0, 0, 0); continue; }
      dydt.push(vxi, vyi, 0, -p.g);
    }
    return dydt;
  },
  postStep: (y, p) => {
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      if (y[i * 4 + 1] < 0) { y[i * 4 + 1] = 0; y[i * 4 + 2] = 0; y[i * 4 + 3] = 0; }
    }
  },
  isEquilibrium: (y, p, t) => {
    if (t < 0.5) return false;
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) { if (y[i * 4 + 1] > 0.01) return false; }
    return true;
  },
  computeDerivedQuantities: (_t, y, p) => {
    const d: Record<string, number> = {};
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      const xi = y[i * 4], yi = y[i * 4 + 1], vxi = y[i * 4 + 2], vyi = y[i * 4 + 3];
      const landed = yi <= 0.001;
      const v = landed ? 0 : Math.sqrt(vxi * vxi + vyi * vyi);
      const m = p[`m_${i}`];
      d[`x_${i}`] = xi;
      d[`y_${i}`] = Math.max(0, yi);
      d[`vx_${i}`] = landed ? 0 : vxi;
      d[`vy_${i}`] = landed ? 0 : vyi;
      d[`v_${i}`] = v;
      d[`Ek_${i}`] = landed ? 0 : 0.5 * m * v * v;
      d[`Ep_${i}`] = m * p.g * Math.max(0, yi);
      d[`Em_${i}`] = d[`Ek_${i}`] + d[`Ep_${i}`];
    }
    return d;
  },
  graphGroups: [
    { type: 'time', title: 'Hauteur y(t)', traces: [0, 1, 2].map(i => ({ key: `y_${i}`, label: OBJ_NAMES_PJ[i], color: OBJ_COLORS_PJ[i] })), yLabel: 'y (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [0, 1, 2].map(i => ({ key: `v_${i}`, label: OBJ_NAMES_PJ[i], color: OBJ_COLORS_PJ[i] })), yLabel: 'v (m/s)' },
    { type: 'time', title: 'Vx(t)', traces: [0, 1, 2].map(i => ({ key: `vx_${i}`, label: OBJ_NAMES_PJ[i], color: OBJ_COLORS_PJ[i] })), yLabel: 'vx (m/s)' },
    { type: 'time', title: 'Vy(t)', traces: [0, 1, 2].map(i => ({ key: `vy_${i}`, label: OBJ_NAMES_PJ[i], color: OBJ_COLORS_PJ[i] })), yLabel: 'vy (m/s)' },
    { type: 'time', title: 'Énergie', traces: [0, 1, 2].flatMap(i => [
      { key: `Ek_${i}`, label: `Ek ${i + 1}`, color: OBJ_COLORS_PJ[i] },
      { key: `Ep_${i}`, label: `Ep ${i + 1}`, color: OBJ_COLORS_PJ[i] + '80' },
    ]), yLabel: 'Énergie (J)' },
  ],
  renderAnimation: (ctx, y, p, t, w, h, hist) => {
    drawBackground(ctx, w, h);
    const n = p.numberOfObjects ?? 1;
    let maxX = 1, maxY = 1;
    for (let i = 0; i < n; i++) {
      const xi = y[i * 4], yi = y[i * 4 + 1];
      maxX = Math.max(maxX, xi + 10);
      maxY = Math.max(maxY, yi + 10);
      const v0 = p[`v0_${i}`] || 30;
      const a = (p[`alpha_${i}`] || 45) * Math.PI / 180;
      maxX = Math.max(maxX, v0 * v0 * Math.sin(2 * a) / p.g + 10);
      maxY = Math.max(maxY, v0 * v0 * Math.sin(a) * Math.sin(a) / (2 * p.g) + 10);
    }
    const groundY = h * 0.82, originX = w * 0.08;
    const plotW = w * 0.85, plotH = groundY - h * 0.08;
    const sx = plotW / maxX, sy = plotH / maxY;
    const scale = Math.min(sx, sy);
    drawGround(ctx, groundY, w);
    ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 0.5;
    ctx.fillStyle = '#9CA3AF'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    const xStep = Math.pow(10, Math.floor(Math.log10(maxX)));
    for (let xv = 0; xv <= maxX; xv += xStep) {
      const px = originX + xv * scale;
      if (px > w - 10) break;
      ctx.beginPath(); ctx.moveTo(px, h * 0.08); ctx.lineTo(px, groundY); ctx.stroke();
      ctx.fillText(`${xv.toFixed(0)}`, px, groundY + 15);
    }
    ctx.textAlign = 'right';
    const yStep = Math.pow(10, Math.floor(Math.log10(maxY)));
    for (let yv = 0; yv <= maxY; yv += yStep) {
      const py = groundY - yv * scale;
      if (py < h * 0.05) break;
      ctx.beginPath(); ctx.moveTo(originX, py); ctx.lineTo(w - 10, py); ctx.stroke();
      ctx.fillText(`${yv.toFixed(0)}`, originX - 4, py + 3);
    }
    ctx.textAlign = 'left';
    if (hist.length > 2) {
      const step = Math.max(1, Math.floor(hist.length / 500));
      for (let i = 0; i < n; i++) {
        ctx.strokeStyle = OBJ_COLORS_PJ[i]; ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (let idx = 0; idx < hist.length; idx += step) {
          const pt = hist[idx];
          const px = originX + pt.state[i * 4] * scale;
          const py = groundY - pt.state[i * 4 + 1] * scale;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    for (let i = 0; i < n; i++) {
      const xi = y[i * 4], yi = y[i * 4 + 1], vxi = y[i * 4 + 2], vyi = y[i * 4 + 3];
      if (yi < -1) continue;
      const px = originX + xi * scale;
      const py = groundY - Math.max(0, yi) * scale;
      const col = OBJ_COLORS_PJ[i];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fill();
      const vScale = scale * 0.2;
      if (Math.sqrt(vxi * vxi + vyi * vyi) * vScale > 3) {
        drawArrow(ctx, px, py, px + vxi * vScale, py - vyi * vScale, col, 2);
      }
    }
    ctx.fillStyle = '#374151'; ctx.beginPath();
    ctx.arc(originX, groundY, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.font = '10px sans-serif';
    ctx.fillText('x (m)', w - 40, groundY + 15);
    ctx.save(); ctx.translate(originX - 20, h * 0.4); ctx.rotate(-Math.PI / 2);
    ctx.fillText('y (m)', 0, 0); ctx.restore();
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  equations: [
    { label: 'Position', text: 'x = v₀·cos(α)·t,  y = v₀·sin(α)·t - ½·g·t²' },
    { label: 'Portée', text: 'R = v₀²·sin(2α) / g' },
    { label: 'Flèche', text: 'H = v₀²·sin²(α) / (2g)' },
    { label: 'Durée de vol', text: 'T = 2·v₀·sin(α) / g' },
  ],
  computeResults: (p, y) => {
    const results: { label: string; value: string; unit: string }[] = [];
    const n = p.numberOfObjects ?? 1;
    for (let i = 0; i < n; i++) {
      const v0 = p[`v0_${i}`] || 30;
      const a = (p[`alpha_${i}`] || 45) * Math.PI / 180;
      const range = v0 * v0 * Math.sin(2 * a) / p.g;
      const maxH = v0 * v0 * Math.sin(a) * Math.sin(a) / (2 * p.g);
      const T = 2 * v0 * Math.sin(a) / p.g;
      const xi = y[i * 4], yi = y[i * 4 + 1];
      const v = Math.sqrt(y[i * 4 + 2] ** 2 + y[i * 4 + 3] ** 2);
      results.push(
        { label: `Portée ${i + 1}`, value: range.toFixed(2), unit: 'm' },
        { label: `Flèche ${i + 1}`, value: maxH.toFixed(2), unit: 'm' },
        { label: `Durée vol ${i + 1}`, value: T.toFixed(2), unit: 's' },
        { label: `Position ${i + 1}`, value: `(${xi.toFixed(1)}, ${yi.toFixed(1)})`, unit: 'm' },
        { label: `Vitesse ${i + 1}`, value: v.toFixed(2), unit: 'm/s' },
      );
    }
    return results;
  },
};

// ============================================================
// EXPORT
// ============================================================
export const simulations: Record<string, SimulationConfig> = {
  'simple-pendulum': simplePendulum,
  'compound-pendulum': compoundPendulum,
  'spring-vertical': springVertical,
  'spring-horizontal': springHorizontal,
  'spring-inclined': springInclined,
  'torsion-pendulum': torsionPendulum,
  'freefall': freeFall,
  'fluid-fall': fluidFall,
  'projectile': projectile,
};

export const simulationList = Object.values(simulations);
export const categories = [...new Set(simulationList.map(s => s.category))];
