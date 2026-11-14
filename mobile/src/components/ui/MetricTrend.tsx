import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { METRIC_META, THRESHOLDS, formatMetric, statusOf, type MetricKey } from '@orbit/shared';
import { alpha, color, font, STATUS_INK } from '../../theme';
import type { Sample } from '../../store/store';

/** Touch selection over real timestamped samples; missing history stays empty. */
export function MetricTrend({ metric, history, width }: { metric: MetricKey; history: Sample[]; width: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const samples = history.filter(s => s.m[metric] != null && Number.isFinite(s.m[metric]));
  if (samples.length < 2) return <View style={{ minHeight: 180, justifyContent: 'center' }}><Text style={font('body', color.muted)}>Aún no hay suficientes muestras para mostrar la tendencia.</Text></View>;
  const band = THRESHOLDS[metric].slice(1, 3);
  const values = samples.map(s => s.m[metric]!);
  // Cumulative metrics have unbounded status thresholds; never stretch a chart to 1e9.
  const bounded = metric !== 'activity';
  const lo = Math.min(...values, bounded ? band[0] : 0), hi = Math.max(...values, bounded ? band[1] : 1);
  const plot = width - 44, h = 200, span = hi - lo || 1;
  const first = samples[0].ts, duration = samples[samples.length - 1].ts - first || 1;
  const x = (ts: number) => 4 + (ts - first) / duration * (plot - 8);
  const y = (v: number) => h - 16 - (v - lo) / span * (h - 32);
  const active = selected == null ? undefined : samples[Math.min(samples.length - 1, selected)];
  const clock = (ts: number) => new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const pick = (px: number) => {
    const ts = first + Math.max(0, Math.min(1, (px - 4) / (plot - 8))) * duration;
    let nearest = 0;
    for (let i = 1; i < samples.length; i++) if (Math.abs(samples[i].ts - ts) < Math.abs(samples[nearest].ts - ts)) nearest = i;
    setSelected(nearest);
  };
  return <View style={{ gap: 8 }}>
    <Text style={font('small', color.muted)}>{active ? `${formatMetric(metric, active.m[metric])} · ${clock(active.ts)}` : 'Toca la gráfica para consultar una muestra'}</Text>
    <View accessibilityLabel={`${METRIC_META[metric].label}, ${samples.length} muestras entre ${clock(first)} y ${clock(first + duration)}`} onStartShouldSetResponder={() => true} onResponderGrant={e => pick(e.nativeEvent.locationX)} onResponderMove={e => pick(e.nativeEvent.locationX)}>
      <Svg width={width} height={h}>
        {bounded && <Rect x={0} width={plot} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} fill={alpha(color.status.ok, .12)} />}
        {[0, .5, 1].map(f => <SvgText key={f} x={plot + 6} y={y(lo + f * span) + 4} fill={color.muted} fontSize={11}>{(lo + f * span).toFixed(METRIC_META[metric].decimals)}</SvgText>)}
        {[0, .5, 1].map(f => <Line key={f} x1={0} x2={plot} y1={y(lo + f * span)} y2={y(lo + f * span)} stroke={color.hairline} strokeWidth={.5} />)}
        <Polyline points={samples.map(s => `${x(s.ts)},${y(s.m[metric]!)}`).join(' ')} stroke={STATUS_INK[statusOf(metric, values[values.length - 1])]} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {active && <Line x1={x(active.ts)} x2={x(active.ts)} y1={4} y2={h - 4} stroke={color.muted} strokeDasharray="3 3" />}
      </Svg>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={font('small', color.muted)}>{clock(first)}</Text><Text style={font('small', color.muted)}>{clock(first + duration)}</Text></View>
    {bounded && <Text style={font('small', color.muted)}>Banda sombreada: rango de referencia</Text>}
  </View>;
}
