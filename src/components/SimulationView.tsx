import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { SimulationConfig, SimulationEngine, DataPoint, exportCSV } from '../physics/core';

// ==================== Nice Axis Tick Calculator ====================

function niceScale(dMin: number, dMax: number, maxTicks: number = 7) {
  if (dMax - dMin < 1e-12) { dMin -= 1; dMax += 1; }
  const range = dMax - dMin;
  const roughStep = range / Math.max(maxTicks - 1, 1);
  const exp = Math.floor(Math.log10(roughStep));
  const pow10 = Math.pow(10, exp);
  const frac = roughStep / pow10;
  let niceFrac: number;
  if (frac <= 1) niceFrac = 1;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 5) niceFrac = 5;
  else niceFrac = 10;
  const step = niceFrac * pow10;
  const nMin = Math.floor(dMin / step) * step;
  const nMax = Math.ceil(dMax / step) * step;
  const ticks: number[] = [];
  for (let v = nMin; v <= nMax + step * 0.001; v += step) {
    ticks.push(parseFloat(v.toFixed(10)));
  }
  return { ticks, min: nMin, max: nMax, step };
}

function formatTickLabel(v: number): string {
  if (Math.abs(v) < 1e-10) return '0';
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

// ==================== PNG Export ====================

function exportChartAsPNG(containerElement: HTMLElement, filename: string) {
  const svg = containerElement.querySelector('svg');
  if (!svg) return;
  const bbox = svg.getBoundingClientRect();
  const width = bbox.width || 600;
  const height = bbox.height || 400;
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute('width', `${width}`);
  cloned.setAttribute('height', `${height}`);
  cloned.setAttribute('viewBox', `0 0 ${width} ${height}`);
  cloned.setAttribute('style', 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;');
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', 'white');
  cloned.insertBefore(bg, cloned.firstChild);
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(cloned);
  const svgDataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = svgDataUri;
}

// ==================== Animation Canvas ====================
function AnimationCanvas({ engineRef }: { engineRef: React.RefObject<SimulationEngine> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let raf: number;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { raf = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(draw); return; }
      const engine = engineRef.current;
      if (!engine) { raf = requestAnimationFrame(draw); return; }
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      if (w <= 0 || h <= 0) { raf = requestAnimationFrame(draw); return; }
      ctx.save();
      ctx.scale(dpr, dpr);
      engine.config.renderAnimation(ctx, engine.state, engine.params, engine.time, w, h, engine.history);
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engineRef]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[280px]">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// ==================== Parameter Panel ====================
function ParameterPanel({
  config,
  params,
  onChange,
}: {
  config: SimulationConfig;
  params: Record<string, number>;
  onChange: (p: Record<string, number>) => void;
}) {
  const maxObjects = config.maxObjectCount ?? 1;
  const numberOfObjects = Math.round(params.numberOfObjects ?? config.defaultObjectCount ?? 1);

  return (
    <div className="p-3 space-y-3 overflow-y-auto text-sm" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <h3 className="font-bold text-slate-700 text-base border-b border-slate-200 pb-2">⚙️ Paramètres</h3>

      {maxObjects > 1 && (
        <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-slate-700 text-xs font-medium">
            Objets ({numberOfObjects}/{maxObjects})
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={numberOfObjects <= 1}
              onClick={() => onChange({ ...params, numberOfObjects: numberOfObjects - 1 })}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-300"
              title="Retirer un objet"
            >
              −
            </button>
            <button
              type="button"
              disabled={numberOfObjects >= maxObjects}
              onClick={() => onChange({ ...params, numberOfObjects: numberOfObjects + 1 })}
              className="px-2 h-6 flex items-center justify-center rounded bg-blue-600 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
              title="Ajouter un objet"
            >
              + Ajouter un objet
            </button>
          </div>
        </div>
      )}

      {config.parameters.map((param) => {
        // Masque les paramètres des objets inactifs
        if (maxObjects > 1) {
          const objMatch = param.key.match(/_(\d+)$/);
          if (objMatch && parseInt(objMatch[1], 10) >= numberOfObjects) {
            return null;
          }
        }

        if (param.type === 'checkbox') {
          return (
            <label key={param.key} className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={params[param.key] > 0.5}
                onChange={(e) => onChange({ ...params, [param.key]: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-slate-700">{param.label}</span>
            </label>
          );
        }
        const isObjParam = param.label.startsWith('●');
        return (
          <div key={param.key} className={isObjParam ? 'pl-3 border-l-2' : ''} style={{ borderLeftColor: isObjParam ? '#3B82F6' : 'transparent' }}>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600 text-xs">{param.label}</span>
              <span className="text-blue-700 font-mono text-xs">
                {params[param.key].toFixed(param.step < 0.1 ? 3 : param.step < 1 ? 2 : 1)} {param.unit}
              </span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={params[param.key]}
              onChange={(e) => onChange({ ...params, [param.key]: parseFloat(e.target.value) })}
              className="w-full h-1.5 accent-blue-600 cursor-pointer"
            />
          </div>
        );
      })}
    </div>
  );
}

// ==================== Control Bar ====================
function ControlBar({
  playing,
  speed,
  time,
  maxTime,
  onPlay,
  onPause,
  onStop,
  onReset,
  onSpeedChange,
  onSeek,
}: {
  playing: boolean;
  speed: number;
  time: number;
  maxTime: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (s: number) => void;
  onSeek: (t: number) => void;
}) {
  const speeds = [0.25, 0.5, 1, 2, 4];
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-t border-slate-200 flex-wrap">
      {playing ? (
        <button onClick={onPause} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium flex items-center gap-1" title="Pause">
          ⏸ Pause
        </button>
      ) : (
        <button onClick={onPlay} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1" title="Lancer">
          ▶ Lancer
        </button>
      )}
      <button onClick={onStop} className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium" title="Arrêter">
        ⏹ Arrêter
      </button>
      <button onClick={onReset} className="px-3 py-1.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 text-sm font-medium" title="Réinitialiser">
        ↺ Réinitialiser
      </button>
      <div className="h-6 w-px bg-slate-300 mx-1" />
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">Vitesse:</span>
        {speeds.map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 rounded text-xs font-medium ${
              Math.abs(speed - s) < 0.01
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      <div className="h-6 w-px bg-slate-300 mx-1" />
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <span className="text-xs font-mono text-slate-600 w-20">{time.toFixed(2)} s</span>
        <input
          type="range"
          min={0}
          max={Math.max(maxTime, 0.01)}
          step={0.01}
          value={time}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ==================== Real-time Time Graph ====================
function TimeGraph({
  history,
  group,
  version,
  windowSec,
  autoWindow,
  numberOfObjects,
}: {
  history: DataPoint[];
  group: Extract<SimulationConfig['graphGroups'][0], { type: 'time' }>;
  version: number;
  windowSec: number;
  autoWindow: boolean;
  numberOfObjects: number;
}) {
  const tMax = history.length > 0 ? history[history.length - 1].t : 1;
  const tMin = autoWindow ? Math.max(0, tMax - windowSec) : 0;

  // ✅ FILTRE DES TRACES : n'affiche que les objets actifs
  const visibleTraces = group.traces.filter(trace => {
    const match = trace.key.match(/_(\d+)$/);
    if (!match) return true; // Trace non liée à un objet → toujours visible
    const objIndex = parseInt(match[1], 10);
    return objIndex < numberOfObjects;
  });

  const step = Math.max(1, Math.floor(history.length / 1000));
  const chartData: Record<string, number>[] = [];
  let yMin = Infinity, yMax = -Infinity;

  for (let i = 0; i < history.length; i += step) {
    const pt = history[i];
    if (pt.t < tMin - 0.001) continue;
    const row: Record<string, number> = { t: pt.t };
    for (const trace of visibleTraces) {
      const val = pt.derived[trace.key] ?? 0;
      row[trace.key] = val;
      if (val < yMin) yMin = val;
      if (val > yMax) yMax = val;
    }
    chartData.push(row);
  }
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (chartData.length === 0 || chartData[chartData.length - 1].t !== last.t) {
      const row: Record<string, number> = { t: last.t };
      for (const trace of visibleTraces) {
        const val = last.derived[trace.key] ?? 0;
        row[trace.key] = val;
        if (val < yMin) yMin = val;
        if (val > yMax) yMax = val;
      }
      chartData.push(row);
    }
  }

  if (yMin === Infinity) { yMin = -1; yMax = 1; }

  const isPositiveY =
    group.positiveY === true ||
    /énergie|hauteur/i.test(group.yLabel) ||
    visibleTraces.some(tr =>
      /^(Ek|Ep|Em)/.test(tr.key) ||
      /[_]Ek|[_]Ep|[_]Em/.test(tr.key) ||
      /^y_/.test(tr.key) ||
      /^v_\d/.test(tr.key)
    );

  if (isPositiveY && yMin < 0) yMin = 0;

  const yPad = Math.max((yMax - yMin) * 0.08, 0.01);
  if (!isPositiveY) yMin -= yPad;
  yMax += yPad;

  const xNice = niceScale(tMin, Math.max(tMax, tMin + 0.1), 6);
  const yNice = niceScale(isPositiveY ? Math.max(yMin, 0) : yMin, yMax, 5);
  if (isPositiveY && yNice.min < 0) yNice.min = 0;
  if (isPositiveY && (yNice.ticks.length === 0 || yNice.ticks[0] < 0)) {
    yNice.ticks = yNice.ticks.filter(t => t >= 0);
    if (yNice.ticks.length === 0 || yNice.ticks[0] !== 0) yNice.ticks.unshift(0);
  }

  void version;

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Lancez la simulation pour voir les courbes…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="t"
          type="number"
          domain={[xNice.min, xNice.max]}
          ticks={xNice.ticks}
          tickFormatter={formatTickLabel}
          tick={{ fontSize: 10 }}
          label={{ value: 't (s)', position: 'insideBottom', offset: -3, fontSize: 10 }}
        />
        <YAxis
          type="number"
          domain={[yNice.min, yNice.max]}
          ticks={yNice.ticks}
          tickFormatter={formatTickLabel}
          tick={{ fontSize: 10 }}
          label={{ value: group.yLabel, angle: -90, position: 'insideLeft', offset: 8, fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ fontSize: 11 }}
          labelFormatter={(v: unknown) => `t = ${Number(v).toFixed(3)} s`}
          formatter={(v: unknown, name: unknown) => [Number(v).toFixed(4), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {visibleTraces.map((trace) => (
          <Line
            key={trace.key}
            type="monotone"
            dataKey={trace.key}
            name={trace.label}
            stroke={trace.color}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ==================== Real-time Phase Graph ====================
function PhaseGraph({
  history,
  group,
  version,
}: {
  history: DataPoint[];
  group: Extract<SimulationConfig['graphGroups'][0], { type: 'phase' }>;
  version: number;
}) {
  const step = Math.max(1, Math.floor(history.length / 800));
  const scatterData: { x: number; y: number }[] = [];
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

  for (let i = 0; i < history.length; i += step) {
    const pt = history[i];
    const x = pt.derived[group.xKey] ?? 0;
    const y = pt.derived[group.yKey] ?? 0;
    scatterData.push({ x, y });
    if (x < xMin) xMin = x; if (x > xMax) xMax = x;
    if (y < yMin) yMin = y; if (y > yMax) yMax = y;
  }
  if (xMin === Infinity) { xMin = -1; xMax = 1; yMin = -1; yMax = 1; }
  const xPad = Math.max((xMax - xMin) * 0.1, 0.01);
  const yPad = Math.max((yMax - yMin) * 0.1, 0.01);

  const xNice = niceScale(xMin - xPad, xMax + xPad, 6);
  const yNice = niceScale(yMin - yPad, yMax + yPad, 5);

  void version;

  if (scatterData.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Lancez la simulation pour voir le diagramme de phase…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          type="number"
          dataKey="x"
          name={group.xLabel}
          domain={[xNice.min, xNice.max]}
          ticks={xNice.ticks}
          tickFormatter={formatTickLabel}
          tick={{ fontSize: 10 }}
          label={{ value: group.xLabel, position: 'insideBottom', offset: -3, fontSize: 10 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={group.yLabel}
          domain={[yNice.min, yNice.max]}
          ticks={yNice.ticks}
          tickFormatter={formatTickLabel}
          tick={{ fontSize: 10 }}
          label={{ value: group.yLabel, angle: -90, position: 'insideLeft', offset: 8, fontSize: 10 }}
        />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 11 }}
          formatter={(v: unknown, name: unknown) => [Number(v).toFixed(4), String(name)]}
          labelFormatter={() => ''}
        />
        <ReferenceLine x={0} stroke="#94A3B8" strokeDasharray="3 3" />
        <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
        <Scatter data={scatterData} fill={group.color} fillOpacity={0.6} r={1.5} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ==================== Graph Panel ====================
function GraphPanel({
  history,
  graphGroups,
  activeTab,
  onTabChange,
  version,
  windowSec,
  autoWindow,
  onWindowSecChange,
  onAutoWindowChange,
  numberOfObjects,
}: {
  history: DataPoint[];
  graphGroups: SimulationConfig['graphGroups'];
  activeTab: number;
  onTabChange: (i: number) => void;
  version: number;
  windowSec: number;
  autoWindow: boolean;
  onWindowSecChange: (s: number) => void;
  onAutoWindowChange: (a: boolean) => void;
  numberOfObjects: number;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const group = graphGroups[activeTab];
  if (!group) return null;

  const handleExportCSV = () => {
    const keys = group.type === 'time'
      ? group.traces.map(t => t.key)
      : [group.xKey, group.yKey];
    exportCSV(history, keys, `simulation_${group.title.replace(/\s+/g, '_')}.csv`);
  };

  const handleExportPNG = () => {
    if (!chartContainerRef.current) return;
    const filename = `simulation_${group.title.replace(/\s+/g, '_')}.png`;
    exportChartAsPNG(chartContainerRef.current, filename);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-2 pt-2 flex-wrap items-center">
        {graphGroups.map((g, i) => (
          <button
            key={i}
            onClick={() => onTabChange(i)}
            className={`px-2 py-1 text-xs rounded-t font-medium transition-colors ${
              activeTab === i
                ? 'bg-white text-blue-700 border border-b-white border-slate-300 -mb-px'
                : 'text-slate-500 hover:text-slate-700 bg-slate-50'
            }`}
          >
            {g.title}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button
            onClick={handleExportPNG}
            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 rounded"
            title="Exporter en image PNG"
          >
            📷 PNG
          </button>
          <button
            onClick={handleExportCSV}
            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 rounded"
            title="Exporter en CSV"
          >
            📥 CSV
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-white border-x border-slate-300 text-[10px]">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={autoWindow}
            onChange={(e) => onAutoWindowChange(e.target.checked)}
            className="w-3 h-3 accent-blue-600"
          />
          <span className="text-slate-600">Fenêtre glissante</span>
        </label>
        {autoWindow && (
          <>
            <span className="text-slate-500">Largeur:</span>
            {[5, 10, 20, 30, 60].map(s => (
              <button
                key={s}
                onClick={() => onWindowSecChange(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  windowSec === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}s
              </button>
            ))}
          </>
        )}
        {history.length > 0 && (
          <span className="ml-auto text-slate-400 font-mono">
            t : 0 → {history[history.length - 1].t.toFixed(2)} s  |  {history.length} pts
          </span>
        )}
      </div>
      <div ref={chartContainerRef} className="flex-1 bg-white border border-slate-300 p-2 min-h-[250px]">
        {group.type === 'time' ? (
          <TimeGraph history={history} group={group} version={version} windowSec={windowSec} autoWindow={autoWindow} numberOfObjects={numberOfObjects} />
        ) : (
          <PhaseGraph history={history} group={group} version={version} />
        )}
      </div>
    </div>
  );
}

// ==================== Equations Display ====================
function EquationsDisplay({ equations }: { equations: SimulationConfig['equations'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 flex items-center gap-2"
      >
        📐 Équations {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="px-4 py-2 space-y-1 bg-white">
          {equations.map((eq, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-slate-500 min-w-[160px]">{eq.label} :</span>
              <span className="font-mono text-blue-800 text-xs">{eq.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Results Table ====================
function ResultsTable({ results }: { results: { label: string; value: string; unit: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 flex items-center gap-2"
      >
        📊 Résultats {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="px-4 py-2 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1 pr-4 text-slate-600 font-medium">Grandeur</th>
                <th className="text-right py-1 pr-4 text-blue-700 font-medium">Valeur</th>
                <th className="text-left py-1 text-slate-500">Unité</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1 pr-4 text-slate-700">{r.label}</td>
                  <td className="py-1 pr-4 text-right font-mono text-blue-700">{r.value}</td>
                  <td className="py-1 text-slate-500">{r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== Main Simulation View ====================
export default function SimulationView({ config }: { config: SimulationConfig }) {
  const engineRef = useRef<SimulationEngine>(new SimulationEngine(config));
  const [tickVersion, setTickVersion] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [params, setParams] = useState<Record<string, number>>(
    () => ({
      ...Object.fromEntries(config.parameters.map(p => [p.key, p.default])),
      numberOfObjects: config.defaultObjectCount ?? 1,
    })
  );
  const [activeGraphTab, setActiveGraphTab] = useState(0);
  const [autoWindow, setAutoWindow] = useState(false);
  const [windowSec, setWindowSec] = useState(10);
  const [equilibriumReached, setEquilibriumReached] = useState(false);

  useEffect(() => {
    const engine = new SimulationEngine(config);
    engineRef.current = engine;
    setParams({
      ...Object.fromEntries(config.parameters.map(p => [p.key, p.default])),
      numberOfObjects: config.defaultObjectCount ?? 1,
    });
    setPlaying(false);
    setSpeed(1);
    setActiveGraphTab(0);
    setAutoWindow(false);
    setWindowSec(10);
    setEquilibriumReached(false);
    setTickVersion(v => v + 1);
  }, [config]);

  useEffect(() => {
    let lastTime = 0;
    let frameCount = 0;
    let raf: number;

    const loop = (timestamp: number) => {
      const engine = engineRef.current;
      if (engine.playing) {
        if (lastTime === 0) lastTime = timestamp;
        const dtReal = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;

        const dtSim = dtReal * engine.speed;
        engine.step(dtSim);

        const point: DataPoint = {
          t: engine.time,
          state: [...engine.state],
          derived: engine.config.computeDerivedQuantities(engine.time, engine.state, engine.params),
        };
        engine.history.push(point);
        if (engine.history.length > 15000) {
          engine.history = engine.history.slice(-12000);
        }

        if (engine.config.isEquilibrium && engine.config.isEquilibrium(engine.state, engine.params, engine.time)) {
          engine.playing = false;
          setPlaying(false);
          setEquilibriumReached(true);
          setTickVersion(v => v + 1);
        }

        frameCount++;
        if (frameCount % 3 === 0) {
          setTickVersion(v => v + 1);
        }
      } else {
        lastTime = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const play = useCallback(() => {
    engineRef.current.playing = true;
    setPlaying(true);
  }, []);

  const pause = useCallback(() => {
    engineRef.current.playing = false;
    setPlaying(false);
    setTickVersion(v => v + 1);
  }, []);

  const stop = useCallback(() => {
    const engine = engineRef.current;
    engine.playing = false;
    engine.reset();
    setPlaying(false);
    setEquilibriumReached(false);
    setTickVersion(v => v + 1);
  }, []);

  const reset = useCallback(() => {
    const engine = engineRef.current;
    engine.playing = false;
    engine.resetToDefaults();
    const defaultParams = {
      ...Object.fromEntries(engine.config.parameters.map(p => [p.key, p.default])),
      numberOfObjects: engine.config.defaultObjectCount ?? 1,
    };
    engine.params = { ...defaultParams };
    setParams(defaultParams);
    setPlaying(false);
    setEquilibriumReached(false);
    setTickVersion(v => v + 1);
  }, []);

  const changeSpeed = useCallback((s: number) => {
    engineRef.current.speed = s;
    setSpeed(s);
  }, []);

  const seek = useCallback((targetTime: number) => {
    const engine = engineRef.current;
    engine.playing = false;
    engine.seekTo(targetTime);
    setPlaying(false);
    setTickVersion(v => v + 1);
  }, []);

  const changeParams = useCallback((newParams: Record<string, number>) => {
    setParams(newParams);
    const engine = engineRef.current;
    engine.params = { ...newParams };
    if (!engine.playing) {
      engine.state = engine.config.getInitialState(engine.params);
      engine.time = 0;
      engine.history = [];
      setTickVersion(v => v + 1);
    }
  }, []);

  const engine = engineRef.current;
  const currentTime = engine.time;
  const currentHistory = engine.history;
  const currentResults = engine.config.computeResults(engine.params, engine.state, engine.time);
  const maxTime = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1].t : 0;

  return (
    <div className="flex h-full">
      <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
        <ParameterPanel config={config} params={params} onChange={changeParams} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{config.name}</h2>
            <p className="text-xs text-slate-500">{config.description}</p>
          </div>
          {equilibriumReached && (
            <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-xs font-medium">
              ✓ Équilibre atteint — courbes conservées
            </span>
          )}
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 border-r border-slate-200">
            <AnimationCanvas engineRef={engineRef} />
          </div>
          <div className="w-[440px] flex-shrink-0 flex flex-col">
            <GraphPanel
              history={currentHistory}
              graphGroups={config.graphGroups}
              activeTab={activeGraphTab}
              onTabChange={setActiveGraphTab}
              version={tickVersion}
              windowSec={windowSec}
              autoWindow={autoWindow}
              onWindowSecChange={setWindowSec}
              onAutoWindowChange={setAutoWindow}
              numberOfObjects={params.numberOfObjects ?? 1}
            />
          </div>
        </div>

        <ControlBar
          playing={playing}
          speed={speed}
          time={currentTime}
          maxTime={maxTime}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onReset={reset}
          onSpeedChange={changeSpeed}
          onSeek={seek}
        />

        <EquationsDisplay equations={config.equations} />
        <ResultsTable results={currentResults} />
      </div>
    </div>
  );
}
