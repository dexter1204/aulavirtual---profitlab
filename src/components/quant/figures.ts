// Constructores de figuras Plotly — portados 1:1 de profitlab_quant/web/app.js.
// Cada función recibe los datos crudos del backend y devuelve { data, layout,
// config } listos para <Plot>. No tocan el DOM (eso lo hace <Plot>).

import {
  C, BASE_LAYOUT, CONFIG, CONFIG3D, isNarrow, levelShapes, SCENE_AX,
  SURF_SCALE, SPECTRUM_SCALE, pctAbs, fmtPrice, fmtLevel, fmtBig,
} from './theme';

export type Figure = { data: any[]; layout: any; config: any };

// ── Gamma & Flow (GEX barras + DEX línea, doble eje x) ────────────────────
export function gammaFigure(d: any): Figure {
  const L = d.levels || {};
  const gexColors = (d.gex || []).map((v: number) => (v >= 0 ? C.green : C.red));
  const gexBars = { type: 'bar', orientation: 'h', x: d.gex || [], y: d.strikes || [],
    marker: { color: gexColors, line: { width: 0 } }, name: 'GEX',
    hovertemplate: 'Strike %{y}<br>GEX %{x:$,.0f}<extra></extra>', xaxis: 'x', yaxis: 'y' };
  const dexLine = { type: 'scatter', mode: 'lines+markers', x: d.dex || [], y: d.dex_strikes || [],
    line: { color: C.cyan, width: 2 }, marker: { size: 4, color: C.cyan }, name: 'DEX',
    hovertemplate: 'Strike %{y}<br>DEX %{x:$,.0f}<extra></extra>', xaxis: 'x2', yaxis: 'y' };
  const { shapes, anns } = levelShapes(d, L);
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: isNarrow() ? { l: 44, r: 30, t: 44, b: 34 } : { l: 64, r: 70, t: 28, b: 36 },
    barmode: 'overlay', bargap: 0.18, showlegend: true,
    legend: { orientation: 'h', x: 0, y: isNarrow() ? 1.16 : 1.08, font: { color: C.text } },
    shapes, annotations: anns,
    xaxis: { title: { text: 'Gamma Exposure ($)', font: { size: 10 } }, zeroline: true,
      zerolinecolor: C.border, gridcolor: C.grid, domain: [0, 1] },
    xaxis2: { overlaying: 'x', side: 'top', showgrid: false, zeroline: false,
      title: { text: isNarrow() ? '' : 'Delta Exposure ($)', font: { size: 10, color: C.cyan } },
      tickfont: { color: C.cyan, size: 9 } },
    yaxis: { title: { text: 'Strike', font: { size: 10 } }, gridcolor: C.grid, zeroline: false,
      tickfont: { size: 10 }, fixedrange: false },
  });
  return { data: [gexBars, dexLine], layout, config: CONFIG };
}

// ── Chart (candlestick + perfil GEX compartiendo el eje de precio) ────────
export function chartFigure(d: any): Figure {
  const L = d.levels || {};
  const bars = d.bars || [];
  const traces: any[] = [];
  if (bars.length) {
    traces.push({
      type: 'candlestick',
      x: bars.map((b: any) => b.t),
      open: bars.map((b: any) => b.o), high: bars.map((b: any) => b.h),
      low: bars.map((b: any) => b.l), close: bars.map((b: any) => b.c),
      increasing: { line: { color: C.green } }, decreasing: { line: { color: C.red } },
      name: d.ticker, xaxis: 'x', yaxis: 'y',
    });
  }
  const gexColors = (d.gex || []).map((v: number) => (v >= 0 ? C.green : C.red));
  traces.push({
    type: 'bar', orientation: 'h', x: d.gex || [], y: d.strikes || [],
    marker: { color: gexColors, line: { width: 0 } }, name: 'GEX', opacity: 0.85,
    hovertemplate: 'Strike %{y}<br>GEX %{x:$,.0f}<extra></extra>', xaxis: 'x2', yaxis: 'y2',
  });
  const { shapes, anns } = levelShapes(d, L);
  if (!bars.length) {
    anns.push({ xref: 'paper', yref: 'paper', x: 0.4, y: 0.5, showarrow: false,
      text: 'Intraday bars no disponibles para este símbolo/plan —<br>mostrando perfil GEX y niveles.',
      font: { size: 12, color: C.muted }, align: 'center' });
  }
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 58, r: 60, t: 30, b: 34 }, showlegend: false, shapes, annotations: anns,
    xaxis: { domain: [0, 0.80], anchor: 'y', rangeslider: { visible: false },
      gridcolor: C.grid, tickfont: { size: 10 }, type: 'date' },
    yaxis: { domain: [0, 1], anchor: 'x', side: 'right', gridcolor: C.grid,
      tickfont: { size: 10 }, title: { text: 'Price', font: { size: 10 } }, fixedrange: false },
    xaxis2: { domain: [0.82, 1], anchor: 'y2', showgrid: false, zeroline: true,
      zerolinecolor: C.border, title: { text: 'GEX', font: { size: 9 } }, tickfont: { size: 8 } },
    yaxis2: { domain: [0, 1], anchor: 'x2', matches: 'y', showticklabels: false, showgrid: false },
  });
  return { data: traces, layout, config: CONFIG };
}

// ── OI / %OI (barras horizontales espejadas) ──────────────────────────────
export function oiFigure(d: any, pct: boolean): Figure {
  const call = pct ? d.call_pct : d.call_oi;
  const put = pct ? d.put_pct : d.put_oi;
  const fmt = pct ? '%{x:.2%}' : '%{x:,.0f}';
  const callT = { type: 'bar', orientation: 'h', y: d.strikes, x: call, name: 'Calls',
    marker: { color: C.green }, hovertemplate: `Strike %{y}<br>Call ${fmt}<extra></extra>` };
  const putT = { type: 'bar', orientation: 'h', y: d.strikes, x: (put || []).map((v: number) => -v), name: 'Puts',
    marker: { color: C.red }, customdata: put,
    hovertemplate: `Strike %{y}<br>Put ${pct ? '%{customdata:.2%}' : '%{customdata:,.0f}'}<extra></extra>` };
  const shapes: any[] = [];
  if (d.spot != null && isFinite(d.spot)) {
    shapes.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: d.spot, y1: d.spot,
      line: { color: C.text, width: 1.2, dash: 'dot' } });
  }
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 62, r: 20, t: 30, b: 40 }, barmode: 'overlay', bargap: 0.12, shapes,
    showlegend: true, legend: { orientation: 'h', x: 0, y: 1.06, font: { color: C.text } },
    xaxis: { title: { text: pct ? 'Share of total OI  (puts ◄ | ► calls)' : 'Open Interest  (puts ◄ | ► calls)', font: { size: 10 } },
      gridcolor: C.grid, zeroline: true, zerolinecolor: C.border, tickformat: pct ? '.1%' : ',', tickfont: { size: 9 } },
    yaxis: { title: { text: 'Strike', font: { size: 10 } }, tickfont: { size: 10 } },
  });
  return { data: [putT, callT], layout, config: CONFIG };
}

// ── Big Trades (flujo $ nocional por nivel, call vs put) ──────────────────
export function flowFigure(d: any): Figure {
  const rows = (d.rows || []).slice().reverse();
  const y = rows.map((r: any) => `$${fmtLevel(r.strike)}`);
  const callT = { type: 'bar', orientation: 'h', y, x: rows.map((r: any) => r.call_notional || 0),
    name: 'Call $', marker: { color: C.green }, customdata: rows.map((r: any) => [r.call_vol || 0]),
    hovertemplate: 'Strike %{y}<br>Call $%{x:,.0f}<br>Vol %{customdata[0]:,.0f}<extra></extra>' };
  const putT = { type: 'bar', orientation: 'h', y, x: rows.map((r: any) => r.put_notional || 0),
    name: 'Put $', marker: { color: C.red }, customdata: rows.map((r: any) => [r.put_vol || 0]),
    hovertemplate: 'Strike %{y}<br>Put $%{x:,.0f}<br>Vol %{customdata[0]:,.0f}<extra></extra>' };
  const anns: any[] = [];
  rows.forEach((r: any, i: number) => {
    if (r.vol_oi && r.vol_oi > 1) anns.push({ xref: 'paper', x: 1, xanchor: 'right', yref: 'y', y: y[i], yanchor: 'middle',
      text: '● NUEVO', showarrow: false, font: { size: 9, color: C.amber } });
  });
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 72, r: 76, t: 28, b: 40 }, barmode: 'stack', annotations: anns,
    showlegend: true, legend: { orientation: 'h', x: 0, y: 1.06, font: { color: C.text } },
    xaxis: { title: { text: '$ nocional negociado hoy', font: { size: 10 } },
      gridcolor: C.grid, tickprefix: '$', tickformat: '.2s', tickfont: { size: 9 } },
    yaxis: { type: 'category', automargin: true, tickfont: { size: 10 } },
  });
  return { data: [callT, putT], layout, config: CONFIG };
}

// ── Delta Surface (3D surface / 2D heatmap) ───────────────────────────────
export function deltaSurfaceFigure(d: any, use3d: boolean): Figure {
  if (use3d) {
    const surf = { type: 'surface', z: d.z || [], x: d.spot_axis || [], y: d.days_axis || [],
      colorscale: SURF_SCALE, cmid: d.kind === 'put' ? -0.5 : 0.5,
      colorbar: { title: { text: 'Δ', side: 'right', font: { size: 9 } }, tickfont: { size: 8 }, thickness: 10 },
      hovertemplate: 'Spot %{x:,.0f}<br>Días %{y:.0f}<br>Δ %{z:.3f}<extra></extra>' };
    const layout = Object.assign({}, BASE_LAYOUT, {
      margin: { l: 0, r: 0, t: 10, b: 0 },
      scene: { dragmode: 'turntable', xaxis: SCENE_AX('Spot'), yaxis: SCENE_AX('Días a vencimiento'),
        zaxis: SCENE_AX(`${d.kind === 'put' ? 'Put' : 'Call'} Δ`),
        camera: { eye: { x: 1.6, y: -1.5, z: 0.9 } }, aspectratio: { x: 1.3, y: 1, z: 0.7 } },
    });
    return { data: [surf], layout, config: CONFIG3D };
  }
  const heat = { type: 'heatmap', z: d.z || [], x: d.spot_axis || [], y: d.days_axis || [],
    colorscale: SURF_SCALE, zmid: d.kind === 'put' ? -0.5 : 0.5,
    colorbar: { title: { text: 'Δ', side: 'right', font: { size: 9 } }, tickfont: { size: 8 }, thickness: 10 },
    hovertemplate: 'Spot %{x:,.0f}<br>Días %{y:.0f}<br>Δ %{z:.3f}<extra></extra>' };
  const shapes: any[] = [];
  if (d.spot != null && isFinite(d.spot)) {
    shapes.push({ type: 'line', xref: 'x', x0: d.spot, x1: d.spot, yref: 'paper', y0: 0, y1: 1,
      line: { color: C.text, width: 1.3, dash: 'dot' } });
  }
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 60, r: 20, t: 30, b: 44 }, shapes,
    xaxis: { title: { text: `Spot  ·  ${d.kind === 'put' ? 'Put' : 'Call'} Δ`, font: { size: 10 } }, gridcolor: C.grid, tickfont: { size: 10 } },
    yaxis: { title: { text: 'Días a vencimiento', font: { size: 10 } }, gridcolor: C.grid, tickfont: { size: 10 } },
  });
  return { data: [heat], layout, config: CONFIG };
}

// ── Net Drift (premium drift + precio, 2 paneles apilados) ────────────────
export function netDriftFigure(d: any): Figure {
  const t = d.t || [], T = d.totals || {};
  const BLUE = '#3b82f6', WHITE = '#e8eef7';
  const callT = { type: 'scatter', mode: 'lines', x: t, y: d.call_drift || [], yaxis: 'y',
    name: `Call Drift (${fmtBig(T.call_drift)})`, line: { color: C.red, width: 1.6 },
    fill: 'tozeroy', fillcolor: 'rgba(239,68,68,.16)', hovertemplate: '%{x}<br>Call drift %{y:$,.3s}<extra></extra>' };
  const putT = { type: 'scatter', mode: 'lines', x: t, y: d.put_drift || [], yaxis: 'y',
    name: `Put Drift (${fmtBig(T.put_drift)})`, line: { color: BLUE, width: 1.6 },
    fill: 'tozeroy', fillcolor: 'rgba(59,130,246,.16)', hovertemplate: '%{x}<br>Put drift %{y:$,.3s}<extra></extra>' };
  const priceT = { type: 'scatter', mode: 'lines', x: t, y: d.price || [], yaxis: 'y2',
    name: `${d.ticker || ''} (${fmtPrice(T.last)})`, line: { color: WHITE, width: 1.4 },
    hovertemplate: `%{x}<br>${d.ticker || ''} $%{y:,.2f}<extra></extra>` };
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 66, r: 20, t: 44, b: 44 }, hovermode: 'x unified',
    showlegend: true, legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.04, font: { color: C.text, size: 11 } },
    xaxis: { type: 'category', tickmode: 'auto', nticks: 12, gridcolor: C.grid, tickfont: { size: 9 }, showgrid: true, anchor: 'y2', domain: [0, 1] },
    yaxis: { domain: [0.56, 1], title: { text: 'Premium drift ($)', font: { size: 10 } }, gridcolor: C.grid,
      zeroline: true, zerolinecolor: C.border, tickfont: { size: 9 }, tickformat: '$~s', anchor: 'x' },
    yaxis2: { domain: [0, 0.46], title: { text: `Precio ${d.ticker || ''}`, font: { size: 10, color: WHITE } }, gridcolor: C.grid,
      zeroline: false, tickfont: { size: 9, color: '#cbd5e1' }, tickprefix: '$', anchor: 'x' },
  });
  return { data: [callT, putT, priceT], layout, config: CONFIG };
}

// ── Volatility — term structure ───────────────────────────────────────────
export function volDriftFigure(d: any): Figure {
  const x = d.dte || [];
  const line = (name: string, arr: any[], color: string, dash?: string) => ({
    type: 'scatter', mode: 'lines+markers', x, y: (arr || []).map((v: any) => v == null ? null : v * 100),
    name, line: { color, width: 2, dash: dash || 'solid' }, marker: { size: 5, color },
    hovertemplate: `${name} %{y:.1f}%<br>%{x} DTE<extra></extra>`,
  });
  const traces = [
    line('ATM IV', d.atm_iv, C.cyan),
    line('Call IV', d.call_iv, C.green, 'dot'),
    line('Put IV', d.put_iv, C.red, 'dot'),
  ];
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 60, r: 24, t: 30, b: 44 }, showlegend: true,
    legend: { orientation: 'h', x: 0, y: 1.08, font: { color: C.text } },
    xaxis: { title: { text: 'Days to expiry', font: { size: 10 } }, gridcolor: C.grid, tickfont: { size: 10 } },
    yaxis: { title: { text: 'Implied volatility (%)', font: { size: 10 } }, gridcolor: C.grid, ticksuffix: '%', tickfont: { size: 10 } },
  });
  return { data: traces, layout, config: CONFIG };
}

// ── Volatility — surface (3D / 2D) ────────────────────────────────────────
export function volSurfaceFigure(d: any, use3d: boolean): Figure {
  const zpct = (d.z || []).map((row: any[]) => row.map((v: any) => v == null ? null : v * 100));
  const x = (d.dte && d.dte.length) ? d.dte : d.expiries;
  if (use3d) {
    const surf = { type: 'surface', z: zpct, x, y: d.strikes || [], colorscale: 'Viridis',
      colorbar: { title: { text: 'IV %', side: 'right', font: { size: 9 } }, tickfont: { size: 8 }, thickness: 10 },
      hovertemplate: 'DTE %{x}<br>Strike %{y:,.0f}<br>IV %{z:.1f}%<extra></extra>' };
    const layout = Object.assign({}, BASE_LAYOUT, {
      margin: { l: 0, r: 0, t: 10, b: 0 },
      scene: { dragmode: 'turntable', xaxis: SCENE_AX('Días a vencimiento'), yaxis: SCENE_AX('Strike'), zaxis: SCENE_AX('IV %'),
        camera: { eye: { x: 1.7, y: -1.5, z: 0.8 } }, aspectratio: { x: 1.3, y: 1, z: 0.7 } },
    });
    return { data: [surf], layout, config: CONFIG3D };
  }
  const heat = { type: 'heatmap', z: zpct, x, y: d.strikes || [], colorscale: 'Viridis',
    colorbar: { title: { text: 'IV %', side: 'right', font: { size: 9 } }, tickfont: { size: 8 }, thickness: 10 },
    hovertemplate: 'DTE %{x}<br>Strike %{y:,.0f}<br>IV %{z:.1f}%<extra></extra>' };
  const shapes: any[] = [];
  if (d.spot != null && isFinite(d.spot)) {
    shapes.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: d.spot, y1: d.spot,
      line: { color: C.text, width: 1.3, dash: 'dot' } });
  }
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 62, r: 20, t: 30, b: 44 }, shapes,
    xaxis: { title: { text: 'Días a vencimiento', font: { size: 10 } }, gridcolor: C.grid, tickfont: { size: 9 } },
    yaxis: { title: { text: 'Strike', font: { size: 10 } }, gridcolor: C.grid, tickfont: { size: 10 } },
  });
  return { data: [heat], layout, config: CONFIG };
}

// ── Volatility Drift (ARV intradía + IV ATM + precio) ─────────────────────
export function volatilityDriftFigure(d: any): Figure {
  const x = d.t || [], arv = d.arv || [], price = d.price || [];
  const ivv = (d.iv == null || !isFinite(d.iv)) ? null : d.iv;
  const lastArv = arv.length ? arv[arv.length - 1] : null;
  const lastPx = price.length ? price[price.length - 1] : null;
  const pctTxt = (v: any) => (v == null || !isFinite(v)) ? '—' : `${v.toFixed(1)}%`;
  const traces: any[] = [{
    type: 'scatter', mode: 'lines', x, y: arv, yaxis: 'y',
    name: `ARV ${d.window || 20}d (${pctTxt(lastArv)})`,
    line: { color: C.amber, width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(255,164,24,.12)',
    hovertemplate: '%{x}<br>ARV %{y:.1f}%<extra></extra>',
  }];
  if (ivv != null) {
    traces.push({ type: 'scatter', mode: 'lines', x, y: x.map(() => ivv), yaxis: 'y',
      name: `IV ATM (${pctTxt(ivv)})`, line: { color: C.cyan, width: 1.8, dash: 'dash' },
      hovertemplate: 'IV ATM %{y:.1f}%<extra></extra>' });
  }
  traces.push({ type: 'scatter', mode: 'lines', x, y: price, yaxis: 'y2',
    name: `${d.ticker || ''} (${fmtPrice(lastPx)})`, line: { color: C.white, width: 1.5 },
    hovertemplate: `%{x}<br>${d.ticker || ''} $%{y:,.2f}<extra></extra>` });
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 56, r: 62, t: 44, b: 44 }, hovermode: 'x unified',
    showlegend: true, legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.02, font: { color: C.text, size: 11 } },
    xaxis: { type: 'category', tickmode: 'auto', nticks: 12, gridcolor: C.grid, tickfont: { size: 9 }, showgrid: true },
    yaxis: { title: { text: 'Volatilidad anual (%)', font: { size: 10 } }, gridcolor: C.grid, zeroline: false, ticksuffix: '%', tickfont: { size: 9 } },
    yaxis2: { title: { text: `Precio ${d.ticker || ''}`, font: { size: 10, color: C.white } }, overlaying: 'y', side: 'right',
      zeroline: false, showgrid: false, tickprefix: '$', tickfont: { size: 9, color: C.text } },
  });
  return { data: traces, layout, config: CONFIG };
}

// ── Espectro 3D (superficie GEX/DEX Net sobre strike × expiry) ────────────
const specDisp = (v: number, R: number) => Math.tanh((Number(v) || 0) / R);
export function spectrumFigure(d: any, mode: 'gex' | 'dex', use3d: boolean): Figure {
  const strikes = d.strikes || [];
  const dte = (d.dte && d.dte.length) ? d.dte : (d.expiries || []).map((_: any, i: number) => i);
  const Z = (mode === 'dex' ? d.z_dex : d.z_gex) || d.z || [];
  const M = mode.toUpperCase();
  const Zt = dte.map((_: any, j: number) => strikes.map((_: any, i: number) => {
    const v = (Z[i] || [])[j];
    return (v == null || !isFinite(v)) ? 0 : v;
  }));
  const flat = Zt.flat();
  const cScale = pctAbs(flat, 0.88) * 1.05;
  const R = pctAbs(flat, 0.88) || 1;

  if (use3d) {
    const nS = strikes.length, nD = dte.length;
    const yIdx = dte.map((_: any, j: number) => j);
    const Zh = Zt.map((row: number[]) => row.map((v) => specDisp(v, R)));
    const txt = Zt.map((row: number[]) => row.map((v) => fmtBig(v)));
    const surf: any = {
      type: 'surface', z: Zh, x: strikes, y: yIdx, surfacecolor: Zt,
      colorscale: SPECTRUM_SCALE, cmid: 0, cmin: -cScale, cmax: cScale, opacity: 0.97,
      contours: { x: { show: true, color: 'rgba(255,255,255,.08)', width: 1 },
        y: { show: true, color: 'rgba(255,255,255,.15)', width: 1 }, z: { show: false } },
      lighting: { ambient: 0.78, diffuse: 0.6, specular: 0.12, roughness: 0.75 },
      colorbar: { title: { text: M, side: 'right', font: { size: 9 } }, tickfont: { size: 8 }, thickness: 10, len: 0.7, tickformat: '$~s' },
      text: txt, customdata: dte.map((dd: number) => strikes.map(() => dd)),
      hovertemplate: 'Strike %{x:,.0f}<br>%{customdata}D<br>' + M + ' %{text}<extra></extra>',
    };
    const traces: any[] = [surf];
    if (d.spot != null && isFinite(d.spot)) {
      traces.push({ type: 'scatter3d', mode: 'lines', x: [d.spot, d.spot], y: [0, nD - 1], z: [0, 0],
        line: { color: C.cyan, width: 5 }, showlegend: false, hovertemplate: `SPOT $${fmtLevel(d.spot)}<extra></extra>` });
    }
    const span = (strikes[nS - 1] - strikes[0]) || 1;
    const raw = span / 9, pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const dtick = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) || pow * 10;
    const layout = Object.assign({}, BASE_LAYOUT, {
      margin: { l: 0, r: 0, t: 0, b: 0 }, showlegend: false,
      scene: { dragmode: 'turntable', bgcolor: 'rgba(0,0,0,0)',
        xaxis: Object.assign(SCENE_AX('Strike'), { tickfont: { size: 10 }, dtick, tick0: Math.ceil(strikes[0] / dtick) * dtick }),
        yaxis: Object.assign(SCENE_AX('Vencimiento'), { tickfont: { size: 9 }, tickmode: 'array', tickvals: yIdx, ticktext: dte.map((dd: number) => `${dd}D`) }),
        zaxis: Object.assign(SCENE_AX(`Net ${M} (relativo)`), { showticklabels: false }),
        camera: { eye: isNarrow() ? { x: 1.6, y: -1.5, z: 0.9 } : { x: 0.85, y: -1.85, z: 0.6 }, center: { x: 0, y: 0, z: isNarrow() ? 0 : -0.04 } },
        aspectratio: isNarrow() ? { x: 1.3, y: 1.0, z: 0.7 } : { x: 2.4, y: 1.0, z: 1.25 } },
    });
    return { data: traces, layout, config: CONFIG3D };
  }
  const heat = { type: 'heatmap', z: Zt, x: strikes, y: dte, zmid: 0, zmin: -cScale, zmax: cScale,
    colorscale: [[0, C.red], [0.5, '#14161C'], [1, C.green]],
    colorbar: { title: { text: M, side: 'right', font: { size: 9 } }, tickfont: { size: 8 }, thickness: 10, tickformat: '$~s' },
    hovertemplate: 'Strike %{x:,.0f}<br>%{y}D<br>' + M + ' %{z:$,.0f}<extra></extra>' };
  const shapes: any[] = [];
  if (d.spot != null && isFinite(d.spot)) {
    shapes.push({ type: 'line', xref: 'x', x0: d.spot, x1: d.spot, yref: 'paper', y0: 0, y1: 1, line: { color: C.cyan, width: 1.4, dash: 'dot' } });
  }
  const layout = Object.assign({}, BASE_LAYOUT, {
    margin: { l: 50, r: 20, t: 16, b: 44 }, shapes,
    xaxis: { title: { text: 'Strike', font: { size: 10 } }, gridcolor: C.grid, tickfont: { size: 9 } },
    yaxis: { title: { text: 'Días a vencimiento', font: { size: 10 } }, gridcolor: C.grid, tickfont: { size: 9 } },
  });
  return { data: [heat], layout, config: CONFIG };
}
