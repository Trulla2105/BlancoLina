import { formatPrice } from "@/lib/format";
import type { ConfigComercial } from "@/lib/types";

/** Mensajes de la barra superior, armados desde la configuración comercial. */
export function mensajesComerciales(cfg: ConfigComercial): string[] {
  const out: string[] = [];
  if (cfg.transferencia_pct > 0) out.push(`${cfg.transferencia_pct}% OFF pagando con transferencia`);
  if (cfg.cuotas > 1) out.push(`${cfg.cuotas} cuotas sin interés`);
  if (cfg.envio_gratis_desde != null) {
    out.push(`Envío gratis desde ${formatPrice(cfg.envio_gratis_desde)}`);
  }
  return out;
}

export function AnnouncementBar({ cfg }: { cfg: ConfigComercial }) {
  const mensajes = mensajesComerciales(cfg);
  if (mensajes.length === 0) return null;
  return (
    <div className="adbar" role="note">
      <div className="adbar-track">
        {mensajes.map((m) => (
          <span key={m} className="adbar-item">
            {m}
          </span>
        ))}
        {/* copia para el desplazamiento continuo en celular */}
        {mensajes.map((m) => (
          <span key={`${m}-copia`} className="adbar-item adbar-copy" aria-hidden>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
