// Core types, RK4 solver, and Simulation Engine

export interface ParameterDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  type?: 'range' | 'checkbox';
}

export interface TraceDef {
  key: string;
  label: string;
  color: string;
}

export interface TimeGraphGroup {
  type: 'time';
  title: string;
  traces: TraceDef[];
  yLabel: string;
  positiveY?: boolean;
}

export interface PhaseGraphGroup {
  type: 'phase';
  title: string;
  xKey: string;
  xLabel: string;
  yKey: string;
  yLabel: string;
  color: string;
}

export type GraphGroup = TimeGraphGroup | PhaseGraphGroup;

export interface EquationDef {
  label: string;
  text: string;
}

export interface ResultRow {
  label: string;
  value: string;
  unit: string;
}

export interface SimulationConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  parameters: ParameterDef[];
  /** Nombre d'objets affichés/actifs au démarrage (par défaut 1 si non défini) */
  defaultObjectCount?: number;
  /** Nombre maximum d'objets que l'élève peut ajouter (si non défini, pas de contrôle affiché) */
  maxObjectCount?: number;
  stateLabels: string[];
  getInitialState: (params: Record<string, number>) => number[];
  derivatives: (t: number, y: number[], params: Record<string, number>) => number[];
  computeDerivedQuantities: (t: number, y: number[], params: Record<string, number>) => Record<string, number>;
  graphGroups: GraphGroup[];
  renderAnimation: (ctx: CanvasRenderingContext2D, y: number[], params: Record<string, number>, t: number, w: number, h: number, history: DataPoint[]) => void;
  postStep?: (y: number[], params: Record<string, number>) => void;
  isEquilibrium?: (y: number[], params: Record<string, number>, t: number) => boolean;
  equations: EquationDef[];
  computeResults: (params: Record<string, number>, y: number[], t: number) => ResultRow[];
}

export interface DataPoint {
  t: number;
  state: number[];
  derived: Record<string, number>;
}

// 4th-order Runge-Kutta solver step
export function rk4Step(
  f: (t: number, y: number[], p: Record<string, number>) => number[],
  t: number,
  y: number[],
  h: number,
  params: Record<string, number>
): number[] {
  const n = y.length;
  const k1 = f(t, y, params);
  const y2 = new Array(n);
  const y3 = new Array(n);
  const y4 = new Array(n);
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    y2[i] = y[i] + (h / 2) * k1[i];
  }
  const k2 = f(t + h / 2, y2, params);
  for (let i = 0; i < n; i++) {
    y3[i] = y[i] + (h / 2) * k2[i];
  }
  const k3 = f(t + h / 2, y3, params);
  for (let i = 0; i < n; i++) {
    y4[i] = y[i] + h * k3[i];
  }
  const k4 = f(t + h, y4, params);
  for (let i = 0; i < n; i++) {
    result[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return result;
}

// Simulation Engine class
export class SimulationEngine {
  config: SimulationConfig;
  params: Record<string, number>;
  state: number[];
  time: number;
  history: DataPoint[];
  speed: number;
  playing: boolean;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.params = {
      ...Object.fromEntries(config.parameters.map(p => [p.key, p.default])),
      numberOfObjects: config.defaultObjectCount ?? 1,
    };
    this.state = config.getInitialState(this.params);
    this.time = 0;
    this.history = [];
    this.speed = 1;
    this.playing = false;
  }

  step(dt: number): void {
    const maxStep = 0.0005;
    const steps = Math.max(1, Math.ceil(dt / maxStep));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.state = rk4Step(this.config.derivatives, this.time, this.state, h, this.params);
      this.time += h;
      if (this.config.postStep) {
        this.config.postStep(this.state, this.params);
      }
    }
  }

  reset(): void {
    this.state = this.config.getInitialState(this.params);
    this.time = 0;
    this.history = [];
  }

  resetToDefaults(): void {
    this.params = {
      ...Object.fromEntries(this.config.parameters.map(p => [p.key, p.default])),
      numberOfObjects: this.config.defaultObjectCount ?? 1,
    };
    this.state = this.config.getInitialState(this.params);
    this.time = 0;
    this.history = [];
  }

  seekTo(targetTime: number): void {
    if (this.history.length === 0) return;
    if (targetTime <= this.history[0].t) {
      this.time = this.history[0].t;
      this.state = [...this.history[0].state];
      this.history = [this.history[0]];
      return;
    }
    if (targetTime >= this.history[this.history.length - 1].t) return;

    let low = 0;
    let high = this.history.length - 1;
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (this.history[mid].t <= targetTime) low = mid;
      else high = mid;
    }
    const p = this.history[low];
    const n = this.history[high];
    const frac = (n.t - p.t) > 0 ? (targetTime - p.t) / (n.t - p.t) : 0;
    this.state = p.state.map((s, i) => s + frac * (n.state[i] - s));
    this.time = targetTime;
    this.history = this.history.slice(0, high);
  }
}

// Drawing helpers
export function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const headLen = Math.min(10, len * 0.3);
  const angle = Math.atan2(dy, dx);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export function drawSpring(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, coils: number = 10, amplitude: number = 8) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);
  const leadIn = Math.min(15, len * 0.08);
  const springLen = Math.max(0, len - 2 * leadIn);
  const segLen = springLen / (coils * 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(leadIn, 0);
  for (let i = 0; i < coils * 2; i++) {
    ctx.lineTo(leadIn + (i + 1) * segLen, i % 2 === 0 ? amplitude : -amplitude);
  }
  ctx.lineTo(len, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#F0F4FF');
  grad.addColorStop(1, '#E4EAF5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#D0D8E8';
  ctx.lineWidth = 0.5;
  const gridSize = 30;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

export function drawGround(ctx: CanvasRenderingContext2D, y: number, w: number) {
  ctx.strokeStyle = '#6B7280';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  for (let x = 0; x < w; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y + 10);
    ctx.stroke();
  }
}

export function drawSupport(ctx: CanvasRenderingContext2D, x: number, y: number, width: number = 60) {
  ctx.fillStyle = '#6B7280';
  ctx.fillRect(x - width / 2, y - 4, width, 4);
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * (width / 7), y - 4);
    ctx.lineTo(x + i * (width / 7) - 6, y - 12);
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function exportCSV(history: DataPoint[], keys: string[], filename: string = 'simulation_data.csv') {
  const header = ['t', ...keys].join(',');
  const rows = history.map(point => {
    return [point.t.toFixed(6), ...keys.map(k => (point.derived[k] ?? 0).toFixed(6))].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
