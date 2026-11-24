import { TruckIcon } from "@/components/ui/Icons";
import { formatPrice } from "@/lib/format";
import type { ConfigComercial } from "@/lib/types";

/** "Te faltan $X para el envío gratis" con barra de progreso. */
export function EnvioProgreso({ subtotal, cfg }: { subtotal: number; cfg: ConfigComercial }) {
  if (cfg.envio_gratis_desde == null || cfg.envio_gratis_desde <= 0) return null;
  const falta = cfg.envio_gratis_desde - subtotal;
  const pct = Math.min(100, Math.round((subtotal / cfg.envio_gratis_desde) * 100));
  return (
    <div className="envio-progreso">
      <div className="envio-progreso-txt">
        <TruckIcon size={18} />
        {falta > 0 ? (
          <span>
            Te faltan <strong>{formatPrice(falta)}</strong> para el envío gratis
          </span>
        ) : (
          <span>
            <strong>¡Tenés envío gratis!</strong>
          </span>
        )}
      </div>
      <div className="envio-progreso-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
