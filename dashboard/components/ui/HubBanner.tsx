import { HUB } from "@/lib/services/hub";

export function HubBanner({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div role="status" className="mb-6 rounded-md bg-raised px-4 py-3 text-small text-muted">
      <strong className="font-semibold text-ink">Hub desconectado</strong> · reintentando conexión a {HUB}
    </div>
  );
}
