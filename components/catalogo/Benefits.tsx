import { BankIcon, CardIcon, TruckIcon } from "@/components/ui/Icons";
import { formatPrice } from "@/lib/format";
import type { ConfigComercial } from "@/lib/types";

/** Franja de beneficios (envío gratis, cuotas, transferencia). */
export function Benefits({ cfg }: { cfg: ConfigComercial }) {
  const items: { icon: React.ReactNode; titulo: string; texto: string }[] = [];
  if (cfg.envio_gratis_desde != null) {
    items.push({
      icon: <TruckIcon size={30} />,
      titulo: "Envío gratis",
      texto: `En compras desde ${formatPrice(cfg.envio_gratis_desde)}`,
    });
  }
  if (cfg.cuotas > 1) {
    items.push({
      icon: <CardIcon size={30} />,
      titulo: `${cfg.cuotas} cuotas sin interés`,
      texto: "Con tarjeta de crédito",
    });
  }
  if (cfg.transferencia_pct > 0) {
    items.push({
      icon: <BankIcon size={30} />,
      titulo: `${cfg.transferencia_pct}% OFF`,
      texto: "Pagando con transferencia",
    });
  }
  if (items.length === 0) return null;
  return (
    <div className="benefits">
      {items.map((b) => (
        <div key={b.titulo} className="benefit">
          {b.icon}
          <div>
            <strong>{b.titulo}</strong>
            <span>{b.texto}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
