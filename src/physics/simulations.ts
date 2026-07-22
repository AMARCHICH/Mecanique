import { SimulationConfig, drawArrow, drawSpring, drawBackground, drawGround, drawSupport } from './core';

// Shared equilibrium detector for damped oscillators
// Oscillators reach equilibrium when both displacement and velocity are negligible
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
    // vertical ref
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + p.L * scale + 20); ctx.stroke();
    ctx.setLineDash([]);
    // angle arc
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
    // rod
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
    // bob
    ctx.fillStyle = '#3B82F6'; ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('m', bx, by);
    // support
    drawSupport(ctx, px, py);
    // forces
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
    // velocity vector
    const vLen = omega * p.L * scale * 0.12;
    if (Math.abs(vLen) > 2) {
      const vdx = vLen * Math.cos(theta);
      const vdy = -vLen * Math.sin(theta);
      drawArrow(ctx, bx, by, bx + vdx, by + vdy, '#8B5CF6', 2);
      ctx.fillStyle = '#8B5CF6'; ctx.fillText('v', bx + vdx + 5, by + vdy);
    }
    // time
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
// 2. PENDULE PESANT
// ============================================================
const compoundPendulum: SimulationConfig = {
  id: 'compound-pendulum',
  name: 'Pendule pesant',
  icon: '⚖️',
  description: 'Pendule pesant (solide en rotation autour d\'un axe fixe)',
  category: 'Oscillations mécaniques',
  parameters: [
    { key: 'm', label: 'Masse m', unit: 'kg', min: 0.1, max: 20, step: 0.1, default: 2.0 },
    { key: 'd', label: 'Dist. axe-G d', unit: 'm', min: 0.05, max: 2, step: 0.05, default: 0.5 },
    { key: 'I', label: 'Moment d\'inertie I', unit: 'kg·m²', min: 0.01, max: 10, step: 0.01, default: 0.5 },
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'b', label: 'Amortissement b', unit: 'N·m·s', min: 0, max: 2, step: 0.01, default: 0.0 },
    { key: 'theta0', label: 'Angle initial θ₀', unit: '°', min: -179, max: 179, step: 1, default: 30 },
    { key: 'omega0', label: 'Vit. ang. initiale ω₀', unit: 'rad/s', min: -10, max: 10, step: 0.1, default: 0 },
  ],
  stateLabels: ['θ (rad)', 'ω (rad/s)'],
  getInitialState: (p) => [p.theta0 * Math.PI / 180, p.omega0],
  derivatives: (_t, y, p) => {
    const [theta, omega] = y;
    return [omega, -(p.m * p.g * p.d / p.I) * Math.sin(theta) - (p.b / p.I) * omega];
  },
  computeDerivedQuantities: (_t, y, p) => {
    const [theta, omega] = y;
    const Ek = 0.5 * p.I * omega * omega;
    const Ep = p.m * p.g * p.d * (1 - Math.cos(theta));
    return {
      theta, omega,
      Ek, Ep, Em: Ek + Ep,
      couple: -p.m * p.g * p.d * Math.sin(theta),
      alpha: -(p.m * p.g * p.d / p.I) * Math.sin(theta) - (p.b / p.I) * omega,
    };
  },
  graphGroups: [
    { type: 'time', title: 'Angle θ(t)', traces: [{ key: 'theta', label: 'θ (rad)', color: '#3B82F6' }], yLabel: 'θ (rad)' },
    { type: 'time', title: 'Vitesse angulaire ω(t)', traces: [{ key: 'omega', label: 'ω (rad/s)', color: '#8B5CF6' }], yLabel: 'ω (rad/s)' },
    { type: 'time', title: 'Couple', traces: [{ key: 'couple', label: 'Γ (N·m)', color: '#EC4899' }], yLabel: 'Couple (N·m)' },
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
    const scale = Math.min(w, h) * 0.3 / Math.max(p.d, 0.1);
    const px = w / 2, py = h * 0.15;
    const barLen = p.d * 1.6 * scale;
    const cmx = px + p.d * scale * Math.sin(theta);
    const cmy = py + p.d * scale * Math.cos(theta);
    // vertical ref
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + p.d * scale + 30); ctx.stroke();
    ctx.setLineDash([]);
    // angle arc
    if (Math.abs(theta) > 0.02) {
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
      const aR = Math.min(45, p.d * scale * 0.3);
      ctx.beginPath();
      if (theta > 0) ctx.arc(px, py, aR, Math.PI / 2, Math.PI / 2 + theta, false);
      else ctx.arc(px, py, aR, Math.PI / 2 + theta, Math.PI / 2, false);
      ctx.stroke();
      ctx.fillStyle = '#F59E0B'; ctx.font = '13px serif';
      const la = Math.PI / 2 + theta / 2;
      ctx.fillText('θ', px + (aR + 14) * Math.cos(la), py + (aR + 14) * Math.sin(la));
    }
    // bar
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(theta);
    ctx.fillStyle = '#64748B'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    const bw = 14, bh = barLen;
    ctx.fillRect(-bw / 2, 0, bw, bh);
    ctx.strokeRect(-bw / 2, 0, bw, bh);
    // CoM
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(0, p.d * scale, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('G', 0, p.d * scale + 3);
    ctx.restore();
    // support
    drawSupport(ctx, px, py);
    // forces
    const fScale = scale * 0.1;
    drawArrow(ctx, cmx, cmy, cmx, cmy + p.m * p.g * fScale, '#EF4444', 2.5);
    ctx.fillStyle = '#EF4444'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('P=mg', cmx + 8, cmy + p.m * p.g * fScale);
    // velocity vector at CoM
    const vScale = scale * 0.12;
    const vLen = omega * p.d * vScale;
    if (Math.abs(vLen) > 2) {
      const vdx = vLen * Math.cos(theta);
      const vdy = -vLen * Math.sin(theta);
      drawArrow(ctx, cmx, cmy, cmx + vdx, cmy + vdy, '#8B5CF6', 2);
      ctx.fillStyle = '#8B5CF6'; ctx.fillText('v', cmx + vdx + 5, cmy + vdy);
    }
    // couple arrow
    const couple = -p.m * p.g * p.d * Math.sin(theta);
    if (Math.abs(couple) > 0.05) {
      ctx.fillStyle = '#EC4899'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      const coupleLabel = couple > 0 ? '↺ Γ' : '↻ Γ';
      ctx.fillText(coupleLabel, px, py - 20);
    }
    ctx.fillStyle = '#EF4444'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('P', cmx + 8, cmy + p.m * p.g * fScale);
    // time
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  isEquilibrium: oscillatorEquilibrium,
  equations: [
    { label: 'Éq. différentielle', text: 'I·d²θ/dt² = -m·g·d·sin(θ) - b·dθ/dt' },
    { label: 'Période (petits angles)', text: 'T₀ = 2π·√(I/(m·g·d))' },
    { label: 'Énergie cinétique', text: 'Ek = ½·I·ω²' },
    { label: 'Énergie potentielle', text: 'Ep = m·g·d·(1 - cos θ)' },
    { label: 'Couple de rappel', text: 'Γ = -m·g·d·sin(θ)' },
  ],
  computeResults: (p, y) => {
    const [theta, omega] = y;
    const T0 = 2 * Math.PI * Math.sqrt(p.I / (p.m * p.g * p.d));
    const Ek = 0.5 * p.I * omega * omega;
    const Ep = p.m * p.g * p.d * (1 - Math.cos(theta));
    return [
      { label: 'Période T₀', value: T0.toFixed(4), unit: 's' },
      { label: 'Fréquence f₀', value: (1 / T0).toFixed(4), unit: 'Hz' },
      { label: 'Angle θ', value: (theta * 180 / Math.PI).toFixed(2), unit: '°' },
      { label: 'Vit. angulaire ω', value: omega.toFixed(4), unit: 'rad/s' },
      { label: 'Ek', value: Ek.toFixed(4), unit: 'J' },
      { label: 'Ep', value: Ep.toFixed(4), unit: 'J' },
      { label: 'Em', value: (Ek + Ep).toFixed(4), unit: 'J' },
      { label: 'Couple Γ', value: (-p.m * p.g * p.d * Math.sin(theta)).toFixed(4), unit: 'N·m' },
    ];
  },
};

// ============================================================
// 3. PENDULE ÉLASTIQUE VERTICAL
// ============================================================
const springVertical: SimulationConfig = {
  id: 'spring-vertical',
  name: 'Pendule élastique vertical',
  icon: '⬇️',
  description: 'Oscillations verticales d\'une masse sur un ressort',
  category: 'Oscillations mécaniques',
  parameters: [
    { key: 'm', label: 'Masse m', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1.0 },
    { key: 'k', label: 'Raideur k', unit: 'N/m', min: 1, max: 100, step: 1, default: 20 },
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0, max: 25, step: 0.1, default: 9.81 },
    { key: 'b', label: 'Amortissement b', unit: 'kg/s', min: 0, max: 5, step: 0.05, default: 0.0 },
    { key: 'x0', label: 'Élongation initiale x₀', unit: 'm', min: -2, max: 2, step: 0.05, default: 0.2 },
    { key: 'v0', label: 'Vitesse initiale v₀', unit: 'm/s', min: -5, max: 5, step: 0.1, default: 0 },
  ],
  stateLabels: ['x (m)', 'v (m/s)'],
  getInitialState: (p) => [p.x0, p.v0],
  derivatives: (_t, y, p) => {
    const [x, v] = y;
    return [v, -(p.k / p.m) * x - (p.b / p.m) * v];
  },
  computeDerivedQuantities: (_t, y, p) => {
    const [x, v] = y;
    const Ek = 0.5 * p.m * v * v;
    const Ep = 0.5 * p.k * x * x;
    return {
      x, v, a: -(p.k / p.m) * x - (p.b / p.m) * v,
      Ek, Ep, Em: Ek + Ep,
      F: -p.k * x,
    };
  },
  graphGroups: [
    { type: 'time', title: 'Position x(t)', traces: [{ key: 'x', label: 'x (m)', color: '#3B82F6' }], yLabel: 'x (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [{ key: 'v', label: 'v (m/s)', color: '#8B5CF6' }], yLabel: 'v (m/s)' },
    { type: 'time', title: 'Accélération a(t)', traces: [{ key: 'a', label: 'a (m/s²)', color: '#EC4899' }], yLabel: 'a (m/s²)' },
    { type: 'time', title: 'Force F(t)', traces: [{ key: 'F', label: 'F (N)', color: '#F97316' }], yLabel: 'F (N)' },
    { type: 'time', title: 'Énergie', traces: [
      { key: 'Ek', label: 'Ek (J)', color: '#EF4444' },
      { key: 'Ep', label: 'Ep (J)', color: '#3B82F6' },
      { key: 'Em', label: 'Em (J)', color: '#10B981' },
    ], yLabel: 'Énergie (J)' },
    { type: 'phase', title: 'Phase (x, v)', xKey: 'x', xLabel: 'x (m)', yKey: 'v', yLabel: 'v (m/s)', color: '#F59E0B' },
  ],
  renderAnimation: (ctx, y, p, t, w, h, _hist) => {
    const [x] = y;
    drawBackground(ctx, w, h);
    const scale = Math.min(w, h) * 0.15;
    const cx = w / 2, topY = h * 0.08;
    const eqY = h * 0.45;
    const massY = eqY + x * scale;
    const massR = Math.max(12, Math.min(28, 8 + p.m * 3));
    // ceiling
    ctx.fillStyle = '#6B7280'; ctx.fillRect(cx - 50, topY, 100, 6);
    for (let i = -4; i <= 4; i++) {
      ctx.strokeStyle = '#6B7280'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + i * 12, topY); ctx.lineTo(cx + i * 12 - 6, topY - 8); ctx.stroke();
    }
    // equilibrium line
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(cx - 40, eqY); ctx.lineTo(cx + 40, eqY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Éq.', cx + 44, eqY + 3);
    // spring
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
    drawSpring(ctx, cx, topY + 6, cx, massY - massR, 12, 10);
    // mass
    ctx.fillStyle = '#3B82F6'; ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, massY, massR, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('m', cx, massY);
    // displacement arrow
    if (Math.abs(x) > 0.01) {
      const arrowX = cx + 50;
      drawArrow(ctx, arrowX, eqY, arrowX, massY, '#F59E0B', 2);
      ctx.fillStyle = '#F59E0B'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('x', arrowX + 6, (eqY + massY) / 2);
    }
    // forces
    const fScale = scale * 0.08;
    // gravity
    drawArrow(ctx, cx, massY + massR, cx, massY + massR + p.m * p.g * fScale, '#EF4444', 2.5);
    ctx.fillStyle = '#EF4444'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('P', cx + 8, massY + massR + p.m * p.g * fScale);
    // spring force
    const Fs = p.k * x;
    const fsLen = Fs * fScale;
    if (Math.abs(fsLen) > 2) {
      drawArrow(ctx, cx, massY - massR, cx, massY - massR - fsLen, '#10B981', 2.5);
      ctx.fillStyle = '#10B981'; ctx.fillText('F', cx + 8, massY - massR - fsLen);
    }
    // time
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  isEquilibrium: oscillatorEquilibrium,
  equations: [
    { label: 'Éq. différentielle', text: 'm·d²x/dt² = -k·x - b·dx/dt   (x depuis équilibre)' },
    { label: 'Période propre', text: 'T₀ = 2π·√(m/k)' },
    { label: 'Énergie cinétique', text: 'Ek = ½·m·v²' },
    { label: 'Énergie potentielle', text: 'Ep = ½·k·x²' },
    { label: 'Force de rappel', text: 'F = -k·x' },
  ],
  computeResults: (p, y) => {
    const [x, v] = y;
    const T0 = 2 * Math.PI * Math.sqrt(p.m / p.k);
    const Ek = 0.5 * p.m * v * v;
    const Ep = 0.5 * p.k * x * x;
    return [
      { label: 'Période T₀', value: T0.toFixed(4), unit: 's' },
      { label: 'Fréquence f₀', value: (1 / T0).toFixed(4), unit: 'Hz' },
      { label: 'Pulsation ω₀', value: Math.sqrt(p.k / p.m).toFixed(4), unit: 'rad/s' },
      { label: 'Élongation x', value: x.toFixed(4), unit: 'm' },
      { label: 'Vitesse v', value: v.toFixed(4), unit: 'm/s' },
      { label: 'Ek', value: Ek.toFixed(4), unit: 'J' },
      { label: 'Ep', value: Ep.toFixed(4), unit: 'J' },
      { label: 'Em', value: (Ek + Ep).toFixed(4), unit: 'J' },
    ];
  },
};

// ============================================================
// 4. PENDULE ÉLASTIQUE HORIZONTAL
// ============================================================
const springHorizontal: SimulationConfig = {
  id: 'spring-horizontal',
  name: 'Pendule élastique horizontal',
  icon: '↔️',
  description: 'Oscillations horizontales d\'une masse sur un ressort',
  category: 'Oscillations mécaniques',
  parameters: [
    { key: 'm', label: 'Masse m', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1.0 },
    { key: 'k', label: 'Raideur k', unit: 'N/m', min: 1, max: 100, step: 1, default: 20 },
    { key: 'b', label: 'Amortissement b', unit: 'kg/s', min: 0, max: 5, step: 0.05, default: 0.0 },
    { key: 'x0', label: 'Élongation initiale x₀', unit: 'm', min: -2, max: 2, step: 0.05, default: 0.3 },
    { key: 'v0', label: 'Vitesse initiale v₀', unit: 'm/s', min: -5, max: 5, step: 0.1, default: 0 },
  ],
  stateLabels: ['x (m)', 'v (m/s)'],
  getInitialState: (p) => [p.x0, p.v0],
  derivatives: (_t, y, p) => {
    const [x, v] = y;
    return [v, -(p.k / p.m) * x - (p.b / p.m) * v];
  },
  computeDerivedQuantities: (_t, y, p) => {
    const [x, v] = y;
    const Ek = 0.5 * p.m * v * v;
    const Ep = 0.5 * p.k * x * x;
    return {
      x, v, a: -(p.k / p.m) * x - (p.b / p.m) * v,
      Ek, Ep, Em: Ek + Ep,
      F: -p.k * x,
    };
  },
  graphGroups: [
    { type: 'time', title: 'Position x(t)', traces: [{ key: 'x', label: 'x (m)', color: '#3B82F6' }], yLabel: 'x (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [{ key: 'v', label: 'v (m/s)', color: '#8B5CF6' }], yLabel: 'v (m/s)' },
    { type: 'time', title: 'Force F(t)', traces: [{ key: 'F', label: 'F (N)', color: '#F97316' }], yLabel: 'F (N)' },
    { type: 'time', title: 'Énergie', traces: [
      { key: 'Ek', label: 'Ek (J)', color: '#EF4444' },
      { key: 'Ep', label: 'Ep (J)', color: '#3B82F6' },
      { key: 'Em', label: 'Em (J)', color: '#10B981' },
    ], yLabel: 'Énergie (J)' },
    { type: 'phase', title: 'Phase (x, v)', xKey: 'x', xLabel: 'x (m)', yKey: 'v', yLabel: 'v (m/s)', color: '#F59E0B' },
  ],
  renderAnimation: (ctx, y, p, t, w, h, _hist) => {
    const [x, v] = y;
    drawBackground(ctx, w, h);
    const scale = Math.min(w, h) * 0.2;
    const eqX = w * 0.45, groundY = h * 0.6;
    const massX = eqX + x * scale;
    const massS = Math.max(20, Math.min(40, 14 + p.m * 4));
    // wall
    ctx.fillStyle = '#94A3B8'; ctx.fillRect(30, groundY - 80, 12, 100);
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = '#64748B'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(30, groundY - 75 + i * 16); ctx.lineTo(18, groundY - 67 + i * 16); ctx.stroke();
    }
    // ground
    drawGround(ctx, groundY, w);
    // equilibrium line
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(eqX, groundY - 60); ctx.lineTo(eqX, groundY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('O', eqX, groundY + 15);
    // spring
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
    drawSpring(ctx, 42, groundY - massS / 2, massX - massS / 2, groundY - massS / 2, 12, 8);
    // mass
    ctx.fillStyle = '#3B82F6'; ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 2;
    ctx.fillRect(massX - massS / 2, groundY - massS, massS, massS);
    ctx.strokeRect(massX - massS / 2, groundY - massS, massS, massS);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('m', massX, groundY - massS / 2);
    // displacement
    if (Math.abs(x) > 0.01) {
      const arrY = groundY - massS - 15;
      drawArrow(ctx, eqX, arrY, massX, arrY, '#F59E0B', 2);
      ctx.fillStyle = '#F59E0B'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('x', (eqX + massX) / 2, arrY - 10);
    }
    // velocity
    const vLen = v * scale * 0.3;
    if (Math.abs(vLen) > 3) {
      drawArrow(ctx, massX, groundY - massS - 25, massX + vLen, groundY - massS - 25, '#8B5CF6', 2);
      ctx.fillStyle = '#8B5CF6'; ctx.font = '10px sans-serif';
      ctx.fillText('v', massX + vLen + (vLen > 0 ? 8 : -8), groundY - massS - 25);
    }
    // force
    const fScale = scale * 0.08;
    const fLen = -p.k * x * fScale;
    if (Math.abs(fLen) > 3) {
      drawArrow(ctx, massX, groundY - massS / 2, massX + fLen, groundY - massS / 2, '#10B981', 2);
    }
    // time
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  isEquilibrium: oscillatorEquilibrium,
  equations: [
    { label: 'Éq. différentielle', text: 'm·d²x/dt² = -k·x - b·dx/dt' },
    { label: 'Période propre', text: 'T₀ = 2π·√(m/k)' },
    { label: 'Énergie cinétique', text: 'Ek = ½·m·v²' },
    { label: 'Énergie potentielle', text: 'Ep = ½·k·x²' },
    { label: 'Force de rappel', text: 'F = -k·x' },
  ],
  computeResults: (p, y) => {
    const [x, v] = y;
    const T0 = 2 * Math.PI * Math.sqrt(p.m / p.k);
    const Ek = 0.5 * p.m * v * v;
    const Ep = 0.5 * p.k * x * x;
    return [
      { label: 'Période T₀', value: T0.toFixed(4), unit: 's' },
      { label: 'Fréquence f₀', value: (1 / T0).toFixed(4), unit: 'Hz' },
      { label: 'Pulsation ω₀', value: Math.sqrt(p.k / p.m).toFixed(4), unit: 'rad/s' },
      { label: 'Élongation x', value: x.toFixed(4), unit: 'm' },
      { label: 'Vitesse v', value: v.toFixed(4), unit: 'm/s' },
      { label: 'Force F', value: (-p.k * x).toFixed(4), unit: 'N' },
      { label: 'Ek', value: Ek.toFixed(4), unit: 'J' },
      { label: 'Ep', value: Ep.toFixed(4), unit: 'J' },
      { label: 'Em', value: (Ek + Ep).toFixed(4), unit: 'J' },
    ];
  },
};

// ============================================================
// 5. PENDULE ÉLASTIQUE INCLINÉ
// ============================================================
const springInclined: SimulationConfig = {
  id: 'spring-inclined',
  name: 'Pendule élastique incliné',
  icon: '📐',
  description: 'Oscillations d\'une masse sur un ressort le long d\'un plan incliné',
  category: 'Oscillations mécaniques',
  parameters: [
    { key: 'm', label: 'Masse m', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1.0 },
    { key: 'k', label: 'Raideur k', unit: 'N/m', min: 1, max: 100, step: 1, default: 20 },
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'alpha', label: 'Angle inclinaison α', unit: '°', min: 5, max: 85, step: 1, default: 30 },
    { key: 'b', label: 'Amortissement b', unit: 'kg/s', min: 0, max: 5, step: 0.05, default: 0.0 },
    { key: 's0', label: 'Élongation initiale s₀', unit: 'm', min: -2, max: 2, step: 0.05, default: 0.3 },
    { key: 'v0', label: 'Vitesse initiale v₀', unit: 'm/s', min: -5, max: 5, step: 0.1, default: 0 },
  ],
  stateLabels: ['s (m)', 'v (m/s)'],
  getInitialState: (p) => [p.s0, p.v0],
  derivatives: (_t, y, p) => {
    const [s, v] = y;
    return [v, -(p.k / p.m) * s - (p.b / p.m) * v];
  },
  computeDerivedQuantities: (_t, y, p) => {
    const [s, v] = y;
    const alphaR = p.alpha * Math.PI / 180;
    const Ek = 0.5 * p.m * v * v;
    const Ep_el = 0.5 * p.k * s * s;
    const Ep_gr = -p.m * p.g * Math.sin(alphaR) * s;
    return {
      s, v, a: -(p.k / p.m) * s - (p.b / p.m) * v,
      Ek, Ep_el, Ep_gr, Em: Ek + Ep_el,
      F: -p.k * s,
      P_component: p.m * p.g * Math.sin(alphaR),
    };
  },
  graphGroups: [
    { type: 'time', title: 'Position s(t)', traces: [{ key: 's', label: 's (m)', color: '#3B82F6' }], yLabel: 's (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [{ key: 'v', label: 'v (m/s)', color: '#8B5CF6' }], yLabel: 'v (m/s)' },
    { type: 'time', title: 'Énergie', traces: [
      { key: 'Ek', label: 'Ek (J)', color: '#EF4444' },
      { key: 'Ep_el', label: 'Ep élast. (J)', color: '#3B82F6' },
      { key: 'Em', label: 'Em (J)', color: '#10B981' },
    ], yLabel: 'Énergie (J)' },
    { type: 'phase', title: 'Phase (s, v)', xKey: 's', xLabel: 's (m)', yKey: 'v', yLabel: 'v (m/s)', color: '#F59E0B' },
  ],
  renderAnimation: (ctx, y, p, t, w, h, _hist) => {
    const [s] = y;
    drawBackground(ctx, w, h);
    const alphaR = p.alpha * Math.PI / 180;
    const scale = Math.min(w, h) * 0.18;
    const baseX = w * 0.15, baseY = h * 0.85;
    const inclineLen = w * 0.65;
    const topX = baseX + inclineLen * Math.cos(alphaR);
    const topY = baseY - inclineLen * Math.sin(alphaR);
    // incline
    ctx.fillStyle = '#D1D5DB'; ctx.strokeStyle = '#6B7280'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(topX, topY);
    ctx.lineTo(baseX, topY);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // angle arc
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(baseX, baseY, 30, -alphaR, 0); ctx.stroke();
    ctx.fillStyle = '#F59E0B'; ctx.font = '12px serif';
    ctx.fillText('α', baseX + 35, baseY - 5);
    // wall at top of incline
    const wallX = topX - 5 * Math.sin(alphaR);
    const wallY = topY - 5 * Math.cos(alphaR);
    ctx.fillStyle = '#94A3B8';
    ctx.save(); ctx.translate(wallX, wallY); ctx.rotate(-alphaR);
    ctx.fillRect(-4, -30, 8, 30);
    ctx.restore();
    // equilibrium & mass position along incline
    const eqDist = inclineLen * 0.5;
    const massDist = eqDist + s * scale;
    const dirX = Math.cos(alphaR), dirY = -Math.sin(alphaR);
    const normX = Math.sin(alphaR), normY = Math.cos(alphaR);
    const eqPosX = baseX + eqDist * dirX;
    const eqPosY = baseY + eqDist * dirY;
    const massPosX = baseX + massDist * dirX;
    const massPosY = baseY + massDist * dirY;
    const massS = Math.max(16, Math.min(30, 10 + p.m * 2.5));
    // equilibrium marker
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(eqPosX - 10 * normX, eqPosY - 10 * normY);
    ctx.lineTo(eqPosX + 10 * normX, eqPosY + 10 * normY); ctx.stroke();
    ctx.setLineDash([]);
    // spring
    const springStartX = wallX - 5 * Math.cos(alphaR);
    const springStartY = wallY + 5 * Math.sin(alphaR);
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
    drawSpring(ctx, springStartX, springStartY,
      massPosX - (massS / 2) * dirX - 5 * normX,
      massPosY - (massS / 2) * dirY - 5 * normY, 10, 6);
    // mass (drawn as rectangle on incline)
    ctx.save(); ctx.translate(massPosX, massPosY); ctx.rotate(-alphaR);
    ctx.fillStyle = '#3B82F6'; ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 2;
    ctx.fillRect(-massS / 2, -massS, massS, massS);
    ctx.strokeRect(-massS / 2, -massS, massS, massS);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('m', 0, -massS / 2);
    ctx.restore();
    // time
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  isEquilibrium: oscillatorEquilibrium,
  equations: [
    { label: 'Éq. différentielle', text: 'm·d²s/dt² = -k·s - b·ds/dt   (s depuis équilibre)' },
    { label: 'Équilibre', text: 'k·s₀ = m·g·sin(α)' },
    { label: 'Période propre', text: 'T₀ = 2π·√(m/k)' },
    { label: 'Énergie potentielle élastique', text: 'Ep = ½·k·s²' },
  ],
  computeResults: (p, y) => {
    const [s, v] = y;
    const T0 = 2 * Math.PI * Math.sqrt(p.m / p.k);
    const Ek = 0.5 * p.m * v * v;
    const Ep = 0.5 * p.k * s * s;
    return [
      { label: 'Période T₀', value: T0.toFixed(4), unit: 's' },
      { label: 'Élongation s', value: s.toFixed(4), unit: 'm' },
      { label: 'Vitesse v', value: v.toFixed(4), unit: 'm/s' },
      { label: 'Force F', value: (-p.k * s).toFixed(4), unit: 'N' },
      { label: 'Ek', value: Ek.toFixed(4), unit: 'J' },
      { label: 'Ep élast.', value: Ep.toFixed(4), unit: 'J' },
      { label: 'Em', value: (Ek + Ep).toFixed(4), unit: 'J' },
    ];
  },
};

// ============================================================
// 6. PENDULE DE TORSION
// ============================================================
const torsionPendulum: SimulationConfig = {
  id: 'torsion-pendulum',
  name: 'Pendule de torsion',
  icon: '🌀',
  description: 'Oscillations de torsion d\'un disque relié à un fil',
  category: 'Oscillations mécaniques',
  parameters: [
    { key: 'I', label: 'Moment d\'inertie I', unit: 'kg·m²', min: 0.01, max: 5, step: 0.01, default: 0.1 },
    { key: 'C', label: 'Constante de torsion C', unit: 'N·m/rad', min: 0.1, max: 50, step: 0.1, default: 5.0 },
    { key: 'beta', label: 'Amortissement β', unit: 'N·m·s', min: 0, max: 1, step: 0.005, default: 0.0 },
    { key: 'theta0', label: 'Angle initial θ₀', unit: '°', min: -180, max: 180, step: 1, default: 45 },
    { key: 'omega0', label: 'Vit. ang. initiale ω₀', unit: 'rad/s', min: -10, max: 10, step: 0.1, default: 0 },
  ],
  stateLabels: ['θ (rad)', 'ω (rad/s)'],
  getInitialState: (p) => [p.theta0 * Math.PI / 180, p.omega0],
  derivatives: (_t, y, p) => {
    const [theta, omega] = y;
    return [omega, -(p.C / p.I) * theta - (p.beta / p.I) * omega];
  },
  computeDerivedQuantities: (_t, y, p) => {
    const [theta, omega] = y;
    const Ek = 0.5 * p.I * omega * omega;
    const Ep = 0.5 * p.C * theta * theta;
    return {
      theta, omega,
      alpha: -(p.C / p.I) * theta - (p.beta / p.I) * omega,
      Ek, Ep, Em: Ek + Ep,
      couple: -p.C * theta,
    };
  },
  graphGroups: [
    { type: 'time', title: 'Angle θ(t)', traces: [{ key: 'theta', label: 'θ (rad)', color: '#3B82F6' }], yLabel: 'θ (rad)' },
    { type: 'time', title: 'Vitesse angulaire ω(t)', traces: [{ key: 'omega', label: 'ω (rad/s)', color: '#8B5CF6' }], yLabel: 'ω (rad/s)' },
    { type: 'time', title: 'Couple Γ(t)', traces: [{ key: 'couple', label: 'Γ (N·m)', color: '#EC4899' }], yLabel: 'Γ (N·m)' },
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
    const cx = w / 2, cy = h / 2;
    const diskR = Math.min(w, h) * 0.25;
    const couple = -p.C * theta;
    // reference line (θ = 0)
    ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(cx, cy - diskR - 20); ctx.lineTo(cx, cy - 20); ctx.stroke();
    ctx.setLineDash([]);
    // wire (top)
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, cy - diskR); ctx.stroke();
    // support
    drawSupport(ctx, cx, 20);
    // disk
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(theta);
    // disk body
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, diskR);
    grad.addColorStop(0, '#93C5FD'); grad.addColorStop(1, '#3B82F6');
    ctx.fillStyle = grad; ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, diskR, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    // radius line
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -diskR + 5); ctx.stroke();
    // center dot
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, 2 * Math.PI); ctx.fill();
    // angle markers
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    for (let a = 0; a < 360; a += 45) {
      const rad = a * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(diskR * 0.7 * Math.cos(rad), diskR * 0.7 * Math.sin(rad));
      ctx.lineTo(diskR * 0.85 * Math.cos(rad), diskR * 0.85 * Math.sin(rad));
      ctx.stroke();
    }
    ctx.restore();
    // angle arc
    if (Math.abs(theta) > 0.02) {
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
      const aR = diskR + 15;
      ctx.beginPath();
      if (theta > 0) ctx.arc(cx, cy, aR, -Math.PI / 2, -Math.PI / 2 + theta);
      else ctx.arc(cx, cy, aR, -Math.PI / 2 + theta, -Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = '#F59E0B'; ctx.font = '13px serif'; ctx.textAlign = 'center';
      const la = -Math.PI / 2 + theta / 2;
      ctx.fillText('θ', cx + (aR + 16) * Math.cos(la), cy + (aR + 16) * Math.sin(la));
    }
    // couple arrow (curved arrow indicator)
    if (Math.abs(couple) > 0.05) {
      ctx.fillStyle = '#EC4899'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      const coupleLabel = couple > 0 ? '↺ Γ = -Cθ' : '↻ Γ = -Cθ';
      ctx.fillText(coupleLabel, cx, cy + diskR + 30);
      ctx.font = '10px monospace';
      ctx.fillText(`|Γ| = ${Math.abs(couple).toFixed(2)} N·m`, cx, cy + diskR + 44);
    }
    // angular velocity indicator
    if (Math.abs(omega) > 0.05) {
      ctx.fillStyle = '#8B5CF6'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      const omegaDir = omega > 0 ? '↻' : '↺';
      ctx.fillText(`${omegaDir} ω = ${omega.toFixed(2)} rad/s`, 10, h - 30);
    }
    // time
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, h - 10);
    ctx.textAlign = 'left';
  },
  isEquilibrium: oscillatorEquilibrium,
  equations: [
    { label: 'Éq. différentielle', text: 'I·d²θ/dt² = -C·θ - β·dθ/dt' },
    { label: 'Période propre', text: 'T₀ = 2π·√(I/C)' },
    { label: 'Énergie cinétique', text: 'Ek = ½·I·ω²' },
    { label: 'Énergie potentielle', text: 'Ep = ½·C·θ²' },
    { label: 'Couple de rappel', text: 'Γ = -C·θ' },
  ],
  computeResults: (p, y) => {
    const [theta, omega] = y;
    const T0 = 2 * Math.PI * Math.sqrt(p.I / p.C);
    const Ek = 0.5 * p.I * omega * omega;
    const Ep = 0.5 * p.C * theta * theta;
    return [
      { label: 'Période T₀', value: T0.toFixed(4), unit: 's' },
      { label: 'Fréquence f₀', value: (1 / T0).toFixed(4), unit: 'Hz' },
      { label: 'Angle θ', value: (theta * 180 / Math.PI).toFixed(2), unit: '°' },
      { label: 'Vit. angulaire ω', value: omega.toFixed(4), unit: 'rad/s' },
      { label: 'Couple Γ', value: (-p.C * theta).toFixed(4), unit: 'N·m' },
      { label: 'Ek', value: Ek.toFixed(4), unit: 'J' },
      { label: 'Ep', value: Ep.toFixed(4), unit: 'J' },
      { label: 'Em', value: (Ek + Ep).toFixed(4), unit: 'J' },
    ];
  },
};

// ============================================================
// 7. CHUTE LIBRE (sans frottement)
// ============================================================
const OBJ_COLORS_FF = ['#EF4444', '#3B82F6', '#10B981'];
const OBJ_NAMES_FF = ['Objet 1', 'Objet 2', 'Objet 3'];

const freeFall: SimulationConfig = {
  id: 'freefall',
  name: 'Chute libre',
  icon: '⬇️',
  description: 'Chute libre sans frottement — expérience de Galilée : tous les objets tombent à la même vitesse',
  category: 'Chute et projectile',
  parameters: [
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'h0', label: 'Hauteur initiale h₀', unit: 'm', min: 1, max: 500, step: 1, default: 100 },
    // Object 1
    { key: 'm_0', label: '● Masse (Objet 1)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    // Object 2
    { key: 'm_1', label: '● Masse (Objet 2)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 5.0 },
    // Object 3
    { key: 'm_2', label: '● Masse (Objet 3)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 50.0 },
  ],
  stateLabels: ['y₀', 'vy₀', 'y₁', 'vy₁', 'y₂', 'vy₂'],
  getInitialState: () => [0, 0, 0, 0, 0, 0],
  derivatives: (_t, y, p) => {
    const dydt: number[] = [];
    for (let i = 0; i < 3; i++) {
      const yi = y[i * 2];
      const vyi = y[i * 2 + 1];
      if (yi >= p.h0) { dydt.push(0, 0); continue; }
      dydt.push(vyi);
      dydt.push(p.g);
    }
    return dydt;
  },
  postStep: (y, p) => {
    for (let i = 0; i < 3; i++) {
      if (y[i * 2] > p.h0) { y[i * 2] = p.h0; y[i * 2 + 1] = 0; }
    }
  },
  isEquilibrium: (y, p, t) => {
    if (t < 0.5) return false;
    for (let i = 0; i < 3; i++) { if (y[i * 2] < p.h0 - 0.01) return false; }
    return true;
  },
  computeDerivedQuantities: (_t, y, p) => {
    const d: Record<string, number> = {};
    for (let i = 0; i < 3; i++) {
      const yi = y[i * 2];
      const vyi = y[i * 2 + 1];
      const m = p[`m_${i}`];
      const h = Math.max(0, p.h0 - yi);
      const landed = yi >= p.h0 - 0.001;
      d[`y_${i}`] = h;
      d[`vy_${i}`] = landed ? 0 : vyi;
      d[`a_${i}`] = landed ? 0 : p.g;
      d[`Ek_${i}`] = landed ? 0 : 0.5 * m * vyi * vyi;
      d[`Ep_${i}`] = m * p.g * h;
      d[`Em_${i}`] = (landed ? 0 : 0.5 * m * vyi * vyi) + m * p.g * h;
    }
    return d;
  },
  graphGroups: [
    { type: 'time', title: 'Hauteur y(t)', traces: [0, 1, 2].map(i => ({ key: `y_${i}`, label: `${OBJ_NAMES_FF[i]}`, color: OBJ_COLORS_FF[i] })), yLabel: 'y (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [0, 1, 2].map(i => ({ key: `vy_${i}`, label: `${OBJ_NAMES_FF[i]}`, color: OBJ_COLORS_FF[i] })), yLabel: 'v (m/s)' },
    { type: 'time', title: 'Accélération a(t)', traces: [0, 1, 2].map(i => ({ key: `a_${i}`, label: `${OBJ_NAMES_FF[i]}`, color: OBJ_COLORS_FF[i] })), yLabel: 'a (m/s²)' },
    { type: 'time', title: 'Énergie', traces: [0, 1, 2].flatMap(i => [
      { key: `Ek_${i}`, label: `Ek ${i + 1}`, color: OBJ_COLORS_FF[i] },
      { key: `Ep_${i}`, label: `Ep ${i + 1}`, color: OBJ_COLORS_FF[i] + '80' },
    ]), yLabel: 'Énergie (J)' },
  ],
  renderAnimation: (ctx, y, p, t, w, h, _hist) => {
    drawBackground(ctx, w, h);
    const groundY = h * 0.85;
    const topY = h * 0.08;
    const scale = (groundY - topY) / Math.max(p.h0, 1);
    const spacing = (w - 40) / 3;
    drawGround(ctx, groundY, w);
    // height markers
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    for (let hh = 0; hh <= p.h0; hh += Math.max(1, Math.floor(p.h0 / 5))) {
      const yy = groundY - hh * scale;
      if (yy < topY) break;
      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(30, yy); ctx.lineTo(w - 10, yy); ctx.stroke();
      ctx.fillText(`${hh}`, 28, yy + 3);
    }
    // Galileo banner
    ctx.fillStyle = '#6366F1'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('  ', w / 2, topY - 30);
    // objects — all at same height since no friction
    for (let i = 0; i < 3; i++) {
      const yi = y[i * 2];
      const vyi = y[i * 2 + 1];
      const hi = Math.max(0, p.h0 - yi);
      const objX = 50 + spacing * i + spacing / 2;
      const objY = groundY - hi * scale;
      const col = OBJ_COLORS_FF[i];
      ctx.strokeStyle = col + '40'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(objX, topY); ctx.lineTo(objX, objY); ctx.stroke();
      ctx.fillStyle = col; ctx.strokeStyle = col.replace(')', ',0.7)'); ctx.lineWidth = 2;
      const ms = Math.max(10, Math.min(20, 8 + Math.log(p[`m_${i}`] + 1) * 5));
      ctx.beginPath(); ctx.arc(objX, objY, ms, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${OBJ_NAMES_FF[i]} (${p[`m_${i}`]} kg)`, objX, topY - 10);
      const vScale = scale * 0.15;
      const vLen = vyi * vScale;
      if (Math.abs(vLen) > 3) {
        drawArrow(ctx, objX + ms + 5, objY, objX + ms + 5, objY + Math.min(vLen, groundY - objY - 5), col, 2);
      }
      ctx.fillStyle = '#374151'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`h=${hi.toFixed(1)}m`, objX + ms + 10, objY);
    }
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  equations: [
    { label: 'Équation', text: 'd²y/dt² = g  (identique pour tous les objets)' },
    { label: 'Galilée', text: 'Dans le vide, la masse n\'influence pas la chute' },
    { label: 'Hauteur', text: 'h(t) = h₀ - ½·g·t²' },
    { label: 'Vitesse', text: 'v(t) = g·t' },
    { label: 'Énergie cinétique', text: 'Ek = ½·m·v²' },
  ],
  computeResults: (p, y) => {
    const results: { label: string; value: string; unit: string }[] = [];
    const tFall = Math.sqrt(2 * p.h0 / p.g);
    const vImpact = p.g * tFall;
    results.push(
      { label: 'Durée de chute', value: tFall.toFixed(3), unit: 's' },
      { label: 'Vitesse impact', value: vImpact.toFixed(2), unit: 'm/s' },
    );
    for (let i = 0; i < 3; i++) {
      const vyi = y[i * 2 + 1];
      const m = p[`m_${i}`];
      results.push(
        { label: `Vitesse ${i + 1}`, value: vyi.toFixed(2), unit: 'm/s' },
        { label: `Ek ${i + 1}`, value: (0.5 * m * vyi * vyi).toFixed(2), unit: 'J' },
      );
    }
    return results;
  },
};

// ============================================================
// 7b. CHUTE DANS UN FLUIDE (avec frottements)
// ============================================================
const OBJ_COLORS_FL = ['#EF4444', '#3B82F6', '#10B981'];
const OBJ_NAMES_FL = ['Objet 1', 'Objet 2', 'Objet 3'];

const fluidFall: SimulationConfig = {
  id: 'fluid-fall',
  name: 'Chute dans un fluide',
  icon: '💧',
  description: 'Chute libre avec frottements fluides — comparaison de plusieurs objets dans un fluide visqueux',
  category: 'Chute et projectile',
  parameters: [
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'h0', label: 'Hauteur initiale h₀', unit: 'm', min: 1, max: 500, step: 1, default: 100 },
    { key: 'rho', label: 'Masse vol. fluide ρ', unit: 'kg/m³', min: 0.1, max: 1500, step: 0.1, default: 1.22 },
    // Object 1
    { key: 'm_0', label: '● Masse (Objet 1)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    { key: 'A_0', label: '● Surface (Objet 1)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.01 },
    { key: 'Cd_0', label: '● Coeff. traînée (Objet 1)', unit: '', min: 0, max: 2, step: 0.01, default: 0.47 },
    // Object 2
    { key: 'm_1', label: '● Masse (Objet 2)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 5.0 },
    { key: 'A_1', label: '● Surface (Objet 2)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.03 },
    { key: 'Cd_1', label: '● Coeff. traînée (Objet 2)', unit: '', min: 0, max: 2, step: 0.01, default: 0.47 },
    // Object 3
    { key: 'm_2', label: '● Masse (Objet 3)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 0.1 },
    { key: 'A_2', label: '● Surface (Objet 3)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.05 },
    { key: 'Cd_2', label: '● Coeff. traînée (Objet 3)', unit: '', min: 0, max: 2, step: 0.01, default: 1.0 },
  ],
  stateLabels: ['y₀', 'vy₀', 'y₁', 'vy₁', 'y₂', 'vy₂'],
  getInitialState: () => [0, 0, 0, 0, 0, 0],
  derivatives: (_t, y, p) => {
    const dydt: number[] = [];
    for (let i = 0; i < 3; i++) {
      const yi = y[i * 2];
      const vyi = y[i * 2 + 1];
      if (yi >= p.h0) { dydt.push(0, 0); continue; }
      dydt.push(vyi);
      const m = p[`m_${i}`];
      const A = p[`A_${i}`];
      const Cd = p[`Cd_${i}`];
      const a = p.g - (0.5 * p.rho * Cd * A * vyi * Math.abs(vyi)) / Math.max(m, 0.001);
      dydt.push(a);
    }
    return dydt;
  },
  postStep: (y, p) => {
    for (let i = 0; i < 3; i++) {
      if (y[i * 2] > p.h0) { y[i * 2] = p.h0; y[i * 2 + 1] = 0; }
    }
  },
  isEquilibrium: (y, p, t) => {
    if (t < 0.5) return false;
    for (let i = 0; i < 3; i++) { if (y[i * 2] < p.h0 - 0.01) return false; }
    return true;
  },
  computeDerivedQuantities: (_t, y, p) => {
    const d: Record<string, number> = {};
    for (let i = 0; i < 3; i++) {
      const yi = y[i * 2];
      const vyi = y[i * 2 + 1];
      const m = p[`m_${i}`];
      const A = p[`A_${i}`];
      const Cd = p[`Cd_${i}`];
      const h = Math.max(0, p.h0 - yi);
      const landed = yi >= p.h0 - 0.001;
      const vLim = Math.sqrt(2 * m * p.g / (p.rho * Cd * Math.max(A, 0.001)));
      const drag = 0.5 * p.rho * Cd * A * vyi * Math.abs(vyi);
      d[`y_${i}`] = h;
      d[`vy_${i}`] = landed ? 0 : vyi;
      d[`a_${i}`] = landed ? 0 : p.g - drag / Math.max(m, 0.001);
      d[`Ek_${i}`] = landed ? 0 : 0.5 * m * vyi * vyi;
      d[`Ep_${i}`] = m * p.g * h;
      d[`Em_${i}`] = (landed ? 0 : 0.5 * m * vyi * vyi) + m * p.g * h;
      d[`v_lim_${i}`] = vLim;
      d[`drag_${i}`] = landed ? 0 : drag;
    }
    return d;
  },
  graphGroups: [
    { type: 'time', title: 'Hauteur y(t)', traces: [0, 1, 2].map(i => ({ key: `y_${i}`, label: `${OBJ_NAMES_FL[i]}`, color: OBJ_COLORS_FL[i] })), yLabel: 'y (m)' },
    { type: 'time', title: 'Vitesse v(t)', traces: [0, 1, 2].map(i => ({ key: `vy_${i}`, label: `${OBJ_NAMES_FL[i]}`, color: OBJ_COLORS_FL[i] })), yLabel: 'v (m/s)' },
    { type: 'time', title: 'Vitesse limite', traces: [0, 1, 2].map(i => ({ key: `v_lim_${i}`, label: `v_lim ${i + 1}`, color: OBJ_COLORS_FL[i] })), yLabel: 'v_lim (m/s)', positiveY: true },
    { type: 'time', title: 'Force de traînée', traces: [0, 1, 2].map(i => ({ key: `drag_${i}`, label: `F_d ${i + 1}`, color: OBJ_COLORS_FL[i] })), yLabel: 'F_d (N)', positiveY: true },
    { type: 'time', title: 'Énergie', traces: [0, 1, 2].flatMap(i => [
      { key: `Ek_${i}`, label: `Ek ${i + 1}`, color: OBJ_COLORS_FL[i] },
      { key: `Ep_${i}`, label: `Ep ${i + 1}`, color: OBJ_COLORS_FL[i] + '80' },
    ]), yLabel: 'Énergie (J)' },
  ],
  renderAnimation: (ctx, y, p, t, w, h, _hist) => {
    drawBackground(ctx, w, h);
    const groundY = h * 0.85;
    const topY = h * 0.08;
    const scale = (groundY - topY) / Math.max(p.h0, 1);
    const spacing = (w - 40) / 3;
    drawGround(ctx, groundY, w);
    // fluid visualization (light blue overlay)
    ctx.fillStyle = 'rgba(147, 197, 253, 0.08)';
    ctx.fillRect(0, topY, w, groundY - topY);
    // height markers
    ctx.fillStyle = '#9CA3AF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    for (let hh = 0; hh <= p.h0; hh += Math.max(1, Math.floor(p.h0 / 5))) {
      const yy = groundY - hh * scale;
      if (yy < topY) break;
      ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(30, yy); ctx.lineTo(w - 10, yy); ctx.stroke();
      ctx.fillText(`${hh}`, 28, yy + 3);
    }
    // title
    ctx.fillStyle = '#0EA5E9'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Chute dans un fluide (ρ = ${p.rho.toFixed(2)} kg/m³)`, w / 2, topY - 12);
    // objects
    for (let i = 0; i < 3; i++) {
      const yi = y[i * 2];
      const vyi = y[i * 2 + 1];
      const hi = Math.max(0, p.h0 - yi);
      const objX = 50 + spacing * i + spacing / 2;
      const objY = groundY - hi * scale;
      const col = OBJ_COLORS_FL[i];
      ctx.strokeStyle = col + '40'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(objX, topY); ctx.lineTo(objX, objY); ctx.stroke();
      ctx.fillStyle = col; ctx.strokeStyle = col.replace(')', ',0.7)'); ctx.lineWidth = 2;
      const ms = Math.max(10, Math.min(20, 8 + Math.log(p[`m_${i}`] + 1) * 5));
      ctx.beginPath(); ctx.arc(objX, objY, ms, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(OBJ_NAMES_FL[i], objX, topY - 2);
      // velocity vector
      const vScale = scale * 0.15;
      const vLen = vyi * vScale;
      if (Math.abs(vLen) > 3) {
        drawArrow(ctx, objX + ms + 5, objY, objX + ms + 5, objY + Math.min(vLen, groundY - objY - 5), col, 2);
      }
      // drag force vector (opposing motion, upward)
      const m = p[`m_${i}`];
      const A = p[`A_${i}`];
      const Cd = p[`Cd_${i}`];
      const dragForce = 0.5 * p.rho * Cd * A * vyi * Math.abs(vyi);
      const dragLen = dragForce / (m * p.g) * p.g * vScale * 0.5;
      if (dragLen > 3) {
        drawArrow(ctx, objX - ms - 5, objY, objX - ms - 5, objY - Math.min(dragLen, 50), '#F97316', 2);
      }
      // info
      ctx.fillStyle = '#374151'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`h=${hi.toFixed(1)}m`, objX + ms + 10, objY);
      const vLim = Math.sqrt(2 * m * p.g / (p.rho * Cd * Math.max(A, 0.001)));
      ctx.fillStyle = '#F97316'; ctx.font = '9px monospace';
      ctx.fillText(`v_lim=${vLim.toFixed(1)}`, objX + ms + 10, objY + 12);
    }
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  equations: [
    { label: 'Avec frottements', text: 'm·d²y/dt² = m·g - ½·ρ·Cd·A·v·|v|' },
    { label: 'Vitesse limite', text: 'v_lim = √(2mg / (ρ·Cd·A))' },
    { label: 'Force de traînée', text: 'F_d = ½·ρ·Cd·A·v²' },
    { label: 'Hauteur', text: 'h(t) = h₀ - y(t)' },
    { label: 'Énergie mécanique', text: 'Em = Ek + Ep (non conservée)' },
  ],
  computeResults: (p, y) => {
    const results: { label: string; value: string; unit: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const vyi = y[i * 2 + 1];
      const m = p[`m_${i}`];
      const A = p[`A_${i}`];
      const Cd = p[`Cd_${i}`];
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
// 8. MOUVEMENT DE PROJECTILE
// ============================================================
const OBJ_COLORS_PJ = ['#EF4444', '#3B82F6', '#10B981'];
const OBJ_NAMES_PJ = ['Projectile 1', 'Projectile 2', 'Projectile 3'];

const projectile: SimulationConfig = {
  id: 'projectile',
  name: 'Mouvement de projectile',
  icon: '🎯',
  description: 'Trajectoire de plusieurs projectiles — avec ou sans résistance de l\'air',
  category: 'Chute et projectile',
  parameters: [
    { key: 'g', label: 'Gravité g', unit: 'm/s²', min: 0.1, max: 25, step: 0.1, default: 9.81 },
    { key: 'air_res', label: 'Résistance de l\'air', unit: '', min: 0, max: 1, step: 1, default: 0, type: 'checkbox' },
    { key: 'rho', label: 'Masse vol. air ρ', unit: 'kg/m³', min: 0.1, max: 5, step: 0.01, default: 1.22 },
    // Projectile 1
    { key: 'm_0', label: '● Masse (Proj. 1)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    { key: 'v0_0', label: '● Vitesse init. (Proj. 1)', unit: 'm/s', min: 1, max: 100, step: 1, default: 30 },
    { key: 'alpha_0', label: '● Angle (Proj. 1)', unit: '°', min: 1, max: 89, step: 1, default: 45 },
    { key: 'Cd_0', label: '● Cd (Proj. 1)', unit: '', min: 0, max: 2, step: 0.01, default: 0.47 },
    { key: 'A_0', label: '● Surface (Proj. 1)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.01 },
    // Projectile 2
    { key: 'm_1', label: '● Masse (Proj. 2)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 1.0 },
    { key: 'v0_1', label: '● Vitesse init. (Proj. 2)', unit: 'm/s', min: 1, max: 100, step: 1, default: 30 },
    { key: 'alpha_1', label: '● Angle (Proj. 2)', unit: '°', min: 1, max: 89, step: 1, default: 60 },
    { key: 'Cd_1', label: '● Cd (Proj. 2)', unit: '', min: 0, max: 2, step: 0.01, default: 0.47 },
    { key: 'A_1', label: '● Surface (Proj. 2)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.01 },
    // Projectile 3
    { key: 'm_2', label: '● Masse (Proj. 3)', unit: 'kg', min: 0.01, max: 100, step: 0.1, default: 0.5 },
    { key: 'v0_2', label: '● Vitesse init. (Proj. 3)', unit: 'm/s', min: 1, max: 100, step: 1, default: 30 },
    { key: 'alpha_2', label: '● Angle (Proj. 3)', unit: '°', min: 1, max: 89, step: 1, default: 30 },
    { key: 'Cd_2', label: '● Cd (Proj. 3)', unit: '', min: 0, max: 2, step: 0.01, default: 0.47 },
    { key: 'A_2', label: '● Surface (Proj. 3)', unit: 'm²', min: 0.001, max: 1, step: 0.001, default: 0.05 },
  ],
  stateLabels: ['x₀', 'y₀', 'vx₀', 'vy₀', 'x₁', 'y₁', 'vx₁', 'vy₁', 'x₂', 'y₂', 'vx₂', 'vy₂'],
  getInitialState: (p) => {
    const s: number[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (p[`alpha_${i}`] || 45) * Math.PI / 180;
      const v0 = p[`v0_${i}`] || 30;
      s.push(0, 0, v0 * Math.cos(a), v0 * Math.sin(a));
    }
    return s;
  },
  derivatives: (_t, y, p) => {
    const dydt: number[] = [];
    for (let i = 0; i < 3; i++) {
      const yi = y[i * 4 + 1];
      const vxi = y[i * 4 + 2], vyi = y[i * 4 + 3];
      // Ground collision: below ground and not going up → stopped
      if (yi <= 0 && vyi <= 0) {
        dydt.push(0, 0, 0, 0);
        continue;
      }
      let ax = 0, ay = -p.g;
      if (p.air_res > 0.5) {
        const m = Math.max(p[`m_${i}`], 0.001);
        const A = p[`A_${i}`];
        const Cd = p[`Cd_${i}`];
        const v = Math.sqrt(vxi * vxi + vyi * vyi);
        if (v > 0.001) {
          const drag = 0.5 * p.rho * Cd * A * v / m;
          ax -= drag * vxi;
          ay -= drag * vyi;
        }
      }
      dydt.push(vxi, vyi, ax, ay);
    }
    return dydt;
  },
  postStep: (y, _p) => {
    for (let i = 0; i < 3; i++) {
      if (y[i * 4 + 1] < 0) {
        y[i * 4 + 1] = 0;
        y[i * 4 + 2] = 0;
        y[i * 4 + 3] = 0;
      }
    }
  },
  isEquilibrium: (y, _p, t) => {
    if (t < 0.5) return false; // don't trigger at launch when yi=0
    for (let i = 0; i < 3; i++) {
      if (y[i * 4 + 1] > 0.01) return false;
    }
    return true;
  },
  computeDerivedQuantities: (_t, y, p) => {
    const d: Record<string, number> = {};
    for (let i = 0; i < 3; i++) {
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
      d[`Em_${i}`] = (landed ? 0 : 0.5 * m * v * v) + m * p.g * Math.max(0, yi);
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
    // Find bounds from history
    let maxX = 1, maxY = 1;
    for (let i = 0; i < 3; i++) {
      const xi = y[i * 4], yi = y[i * 4 + 1];
      maxX = Math.max(maxX, xi + 10);
      maxY = Math.max(maxY, yi + 10);
    }
    // Also check analytical range for scaling
    for (let i = 0; i < 3; i++) {
      const v0 = p[`v0_${i}`] || 30;
      const a = (p[`alpha_${i}`] || 45) * Math.PI / 180;
      maxX = Math.max(maxX, v0 * v0 * Math.sin(2 * a) / p.g + 10);
      maxY = Math.max(maxY, v0 * v0 * Math.sin(a) * Math.sin(a) / (2 * p.g) + 10);
    }
    const groundY = h * 0.82;
    const originX = w * 0.08;
    const plotW = w * 0.85;
    const plotH = groundY - h * 0.08;
    const sx = plotW / maxX;
    const sy = plotH / maxY;
    const scale = Math.min(sx, sy);
    // ground
    drawGround(ctx, groundY, w);
    // grid
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
    // trajectories from history
    if (hist.length > 2) {
      const step = Math.max(1, Math.floor(hist.length / 500));
      for (let i = 0; i < 3; i++) {
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
    // current positions
    for (let i = 0; i < 3; i++) {
      const xi = y[i * 4], yi = y[i * 4 + 1], vxi = y[i * 4 + 2], vyi = y[i * 4 + 3];
      if (yi < -1) continue;
      const px = originX + xi * scale;
      const py = groundY - Math.max(0, yi) * scale;
      const col = OBJ_COLORS_PJ[i];
      // object
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fill();
      // velocity vector
      const vScale = scale * 0.2;
      if (Math.sqrt(vxi * vxi + vyi * vyi) * vScale > 3) {
        drawArrow(ctx, px, py, px + vxi * vScale, py - vyi * vScale, col, 2);
      }
    }
    // origin marker
    ctx.fillStyle = '#374151'; ctx.beginPath();
    ctx.arc(originX, groundY, 4, 0, 2 * Math.PI); ctx.fill();
    // labels
    ctx.font = '10px sans-serif';
    ctx.fillText('x (m)', w - 40, groundY + 15);
    ctx.save(); ctx.translate(originX - 20, h * 0.4); ctx.rotate(-Math.PI / 2);
    ctx.fillText('y (m)', 0, 0); ctx.restore();
    // time
    ctx.fillStyle = '#374151'; ctx.font = '13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`t = ${t.toFixed(2)} s`, w - 10, 10);
    ctx.textAlign = 'left';
  },
  equations: [
    { label: 'Sans résistance', text: 'x = v₀·cos(α)·t,  y = v₀·sin(α)·t - ½·g·t²' },
    { label: 'Portée', text: 'R = v₀²·sin(2α) / g' },
    { label: 'Flèche', text: 'H = v₀²·sin²(α) / (2g)' },
    { label: 'Durée de vol', text: 'T = 2·v₀·sin(α) / g' },
    { label: 'Avec résistance', text: 'm·dv/dt = m·g - ½·ρ·Cd·A·v·|v|' },
  ],
  computeResults: (p, y) => {
    const results: { label: string; value: string; unit: string }[] = [];
    for (let i = 0; i < 3; i++) {
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
// EXPORT ALL SIMULATIONS
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
