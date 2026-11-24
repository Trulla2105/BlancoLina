"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CloseIcon } from "@/components/ui/Icons";
import { useCart } from "@/lib/cart/CartContext";
import { formatPrice } from "@/lib/format";
import type { ConfigComercial } from "@/lib/types";
import { EnvioProgreso } from "./EnvioProgreso";
import { QtyStepper } from "./QtyStepper";

/** Carrito lateral: se abre al agregar un producto o al tocar el ícono. */
export function CartDrawer({ cfg }: { cfg: ConfigComercial }) {
  const { items, drawerOpen, setDrawerOpen, setCantidad, remove, subtotal } = useCart();
  const pathname = usePathname();
  const close = () => setDrawerOpen(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={close}>
      <aside
        className="drawer drawer-right"
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <span className="drawer-title">Carrito de compras</span>
          <button type="button" className="icon-button" aria-label="Cerrar carrito" onClick={close}>
            <CloseIcon size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <p>Tu carrito está vacío.</p>
            <Link href="/productos" className="btn" onClick={close}>
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            <ul className="mini-cart">
              {items.map((item) => (
                <li key={item.variantId} className="mini-cart-item">
                  <Link href={`/productos/${item.slug}`} className="mini-cart-img" onClick={close}>
                    {item.imagen ? <img src={item.imagen} alt="" /> : null}
                  </Link>
                  <div className="mini-cart-info">
                    <Link href={`/productos/${item.slug}`} className="mini-cart-name" onClick={close}>
                      {item.nombre}
                    </Link>
                    <div className="mini-cart-variant">
                      {item.color}
                      {item.medida !== "Única" && ` · ${item.etiquetaMedida} ${item.medida}`}
                    </div>
                    <div className="mini-cart-row">
                      <QtyStepper
                        value={item.cantidad}
                        max={Math.min(99, item.stock)}
                        onChange={(n) => setCantidad(item.variantId, n)}
                        small
                      />
                      <span className="mini-cart-price">{formatPrice(item.precio * item.cantidad)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mini-cart-remove"
                    aria-label={`Quitar ${item.nombre}`}
                    onClick={() => remove(item.variantId)}
                  >
                    <CloseIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <EnvioProgreso subtotal={subtotal} cfg={cfg} />
              <div className="drawer-total">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              {cfg.transferencia_pct > 0 && (
                <div className="drawer-transfer">
                  {formatPrice(subtotal - Math.round((subtotal * cfg.transferencia_pct) / 100))} pagando con
                  transferencia
                </div>
              )}
              <Link href="/checkout" className="btn btn-solid btn-block" onClick={close}>
                Iniciar compra
              </Link>
              <Link href="/carrito" className="btn btn-block" onClick={close}>
                Ver carrito
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
