import { CardIcon, TruckIcon } from "@/components/ui/Icons";
import { formatPrice } from "@/lib/format";
import {
  porcentajeOferta,
  precioSinImpuestos,
  precioTransferencia,
  valorCuota,
} from "@/lib/precios";
import type { ConfigComercial } from "@/lib/types";

/** Precio de la ficha: tachado si hay oferta, transferencia, cuotas y envío. */
export function PriceBlock({
  precio,
  precioLista,
  cfg,
  compacto = false,
}: {
  precio: number; // lo que se cobra
  precioLista: number | null; // precio sin oferta (si hay oferta)
  cfg: ConfigComercial;
  compacto?: boolean;
}) {
  const off = precioLista != null ? porcentajeOferta(precioLista, precio) : null;
  return (
    <div className="price-block">
      {precioLista != null && <div className="price-old">{formatPrice(precioLista)}</div>}
      <div className="price-main">
        <span className="price-now">{formatPrice(precio)}</span>
        {off != null && <span className="price-off">{off}% OFF</span>}
      </div>
      {!compacto && (
        <div className="price-taxes">Precio sin impuestos nacionales: {formatPrice(precioSinImpuestos(precio))}</div>
      )}
      {cfg.transferencia_pct > 0 && (
        <div className="price-transfer">
          <strong>{formatPrice(precioTransferencia(precio, cfg))}</strong> con Transferencia
        </div>
      )}
      {!compacto && (
        <div className="price-rows">
          {cfg.cuotas > 1 && (
            <div className="price-row">
              <CardIcon size={20} />
              <span>
                <strong>{cfg.cuotas} cuotas sin interés</strong> de {formatPrice(valorCuota(precio, cfg))}
              </span>
            </div>
          )}
          {cfg.envio_gratis_desde != null && (
            <div className="price-row">
              <TruckIcon size={20} />
              <span>
                <strong>Envío gratis</strong> superando los {formatPrice(cfg.envio_gratis_desde)}
              </span>
            </div>
          )}
        </div>
      )}
      {compacto && cfg.cuotas > 1 && (
        <div className="price-cuotas">
          {cfg.cuotas} x {formatPrice(valorCuota(precio, cfg))} sin interés
        </div>
      )}
    </div>
  );
}
