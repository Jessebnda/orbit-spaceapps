"use client";

import { useMemo } from "react";
import type { MetricKey } from "@orbit/shared";
import { downsample } from "@/lib/domain/downsample";
import { useApi } from "@/lib/services/useApi";
import type { HistoryPoint } from "@/lib/services/hub";

/** Last 6 h of one member, thinned to <= 40 points per metric; refreshed every minute. */
export function useCrewSpark(id: string) {
  const { data } = useApi<HistoryPoint[]>(`/api/history/${id}?hours=6`, 60_000);
  return useMemo(() => (k: MetricKey) => downsample((data ?? []).flatMap((h) => (h.metrics[k] == null ? [] : [h.metrics[k] as number])), 40), [data]);
}
