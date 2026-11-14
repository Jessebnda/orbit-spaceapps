/** Pure SVG trend: straight 1.5 px line, optional normal band, last point marked. No axes. Fills its container's width. */
export function Sparkline({ values, width = 238, height = 28, band, color = "var(--t-accent)", lastColor, domain, label, fluid = true }: { values: number[]; width?: number; height?: number; band?: [number, number]; color?: string; lastColor?: string; domain?: [number, number]; label?: string; fluid?: boolean }) {
  const w = fluid ? "100%" : width;
  if (values.length < 2) return <div style={{ width: w, height }} aria-hidden />;
  const lo = domain?.[0] ?? Math.min(...values, band?.[0] ?? Infinity);
  const hi = domain?.[1] ?? Math.max(...values, band?.[1] ?? -Infinity);
  const span = hi - lo || 1;
  const pad = 3;
  const VW = 240; // internal units; the svg stretches horizontally, strokes stay 1.5 px
  const x = (i: number) => (i / (values.length - 1)) * VW;
  const y = (v: number) => height - pad - ((Math.min(Math.max(v, lo), hi) - lo) / span) * (height - 2 * pad);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const last = values[values.length - 1];
  return (
    <div className="relative" style={{ width: w, height }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg width="100%" height={height} viewBox={`0 0 ${VW} ${height}`} preserveAspectRatio="none" className="absolute inset-0 block">
        {band && <rect x={0} width={VW} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} fill="rgba(255,255,255,.06)" />}
        <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ right: -2.5, left: "auto", top: y(last), background: lastColor ?? color, transform: "translateY(-50%)" }} />
    </div>
  );
}
