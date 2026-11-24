"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { TrashIcon } from "@/components/ui/Icons";
import { useCart } from "@/lib/cart/CartContext";
import { formatPrice } from "@/lib/format";
import { tieneEnvioGratis } from "@/lib/precios";
import type { ConfigComercial } from "@/lib/types";
import { EnvioProgreso } from "./EnvioProgreso";
import { QtyStepper } from "./QtyStepper";
import { useSyncCart } from "./useSyncCart";

export function CartView({ cfg }: { cfg: ConfigComercial }) {
  const { items, mounted, setCantidad, remove, subtotal } = useCart();
  const { avisos } = useSyncCart();

  if (!mounted) return <div className="cart-page-loading">Cargando carrito…</div>;

  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <p>Tu carrito está vacío.</p>
        <Link href="/productos" className="btn btn-solid">
          Ver productos
        </Link>
      </div>
    );
  }

  const descuento = Math.round((subtotal * cfg.transferencia_pct) / 100);
  const envio = tieneEnvioGratis(subtotal, cfg) ? 0 : cfg.costo_envio;

  return (
    <div className="cart-layout">
      <div className="cart-items">
        {avisos.length > 0 && (
          <div className="notice">
            {avisos.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        )}
        {items.map((item) => (
          <div key={item.variantId} className="cart-row">
            <Link href={`/productos/${item.slug}`} className="cart-row-img">
              {item.imagen && <img src={item.imagen} alt="" />}
            </Link>
            <div className="cart-row-info">
              <Link href={`/productos/${item.slug}`} className="cart-row-name">
                {item.nombre}
              </Link>
              <div className="cart-row-variant">
                {item.color}
                {item.medida !== "Única" && ` · ${item.etiquetaMedida} ${item.medida}`}
              </div>
              <div className="cart-row-unit">{formatPrice(item.precio)} c/u</div>
            </div>
            <QtyStepper
              value={item.cantidad}
              max={Math.min(99, item.stock)}
              onChange={(n) => setCantidad(item.variantId, n)}
            />
            <div className="cart-row-total">{formatPrice(item.precio * item.cantidad)}</div>
            <button
              type="button"
              className="icon-button cart-row-remove"
              aria-label={`Quitar ${item.nombre}`}
              onClick={() => remove(item.variantId)}
            >
              <TrashIcon size={18} />
            </button>
          </div>
        ))}
      </div>

      <aside className="cart-summary">
        <h2>Resumen</h2>
        <EnvioProgreso subtotal={subtotal} cfg={cfg} />
        <div className="sum-row">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="sum-row">
          <span>Envío</span>
          <span>{envio === 0 ? "Gratis" : envio == null ? "A coordinar" : formatPrice(envio)}</span>
        </div>
        <div className="sum-row sum-total">
          <span>Total</span>
          <span>{formatPrice(subtotal + (envio ?? 0))}</span>
        </div>
        {cfg.transferencia_pct > 0 && (
          <div className="sum-transfer">
            <strong>{formatPrice(subtotal - descuento + (envio ?? 0))}</strong> pagando con transferencia (
            {cfg.transferencia_pct}% OFF)
          </div>
        )}
        {cfg.cuotas > 1 && (
          <div className="sum-cuotas">
            o {cfg.cuotas} cuotas sin interés de {formatPrice((subtotal + (envio ?? 0)) / cfg.cuotas)}
          </div>
        )}
        <Link href="/checkout" className="btn btn-solid btn-block">
          Iniciar compra
        </Link>
        <Link href="/productos" className="btn btn-block btn-ghost">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
