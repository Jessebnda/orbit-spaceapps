"use client";

import { useMemo } from "react";
import type { MetricKey } from "@orbit/shared";
import { downsample } from "@/lib/domain/downsample";
import { base7 as base7Of, lastSevenDays } from "@/lib/domain/vitals";
import { useApi } from "@/lib/services/useApi";
import type { HistoryPoint } from "@/lib/services/hub";

const series = (h: HistoryPoint[], k: MetricKey) => h.flatMap((p) => (p.metrics[k] == null ? [] : [{ ts: p.ts, v: p.metrics[k] as number }]));

/** Last 6 h per metric (<= 40 points) for sparklines; refreshed every minute. */
export function useCrewSpark(id: string) {
  const { data } = useApi<HistoryPoint[]>(`/api/history/${id}?hours=6`, 60_000);
  return useMemo(() => (k: MetricKey) => downsample(series(data ?? [], k), 40).map((p) => p.v), [data]);
}

/** 7-day baselines (null until the history spans 3 days) and the last seven nights of sleep. */
export function useCrewBase(id: string, now: number) {
  const { data } = useApi<HistoryPoint[]>(`/api/history/${id}?hours=168`, 300_000);
  return useMemo(
    () => ({ base: (k: MetricKey) => base7Of(series(data ?? [], k)), nights: now ? lastSevenDays(series(data ?? [], "sleep"), now) : [] }),
    [data, now],
  );
}
