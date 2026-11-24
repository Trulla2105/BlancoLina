"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSyncCart } from "@/components/cart/useSyncCart";
import { crearPedido, type CheckoutInput } from "@/lib/actions/tienda";
import { useCart } from "@/lib/cart/CartContext";
import { formatPrice } from "@/lib/format";
import { tieneEnvioGratis } from "@/lib/precios";
import type { ConfigComercial, MetodoPago } from "@/lib/types";

const PROVINCIAS = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

export function CheckoutForm({ cfg, mpHabilitado }: { cfg: ConfigComercial; mpHabilitado: boolean }) {
  const router = useRouter();
  const { items, mounted, subtotal, clear } = useCart();
  const { listo, avisos } = useSyncCart();
  const [entrega, setEntrega] = useState<"domicilio" | "retiro">("domicilio");
  const [metodo, setMetodo] = useState<MetodoPago>("transferencia");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!mounted) return <div className="cart-page-loading">Cargando…</div>;
  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <p>No hay productos en el carrito.</p>
        <Link href="/productos" className="btn btn-solid">
          Ver productos
        </Link>
      </div>
    );
  }

  const pct = metodo === "transferencia" ? cfg.transferencia_pct : 0;
  const descuento = Math.round((subtotal * pct) / 100);
  const envio = entrega === "retiro" || tieneEnvioGratis(subtotal, cfg) ? 0 : cfg.costo_envio;
  const total = subtotal - descuento + (envio ?? 0);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const input: CheckoutInput = {
      items: items.map((i) => ({ variantId: i.variantId, cantidad: i.cantidad })),
      cliente: {
        email: s("email"),
        nombre: s("nombre"),
        apellido: s("apellido"),
        telefono: s("telefono"),
        dni: s("dni"),
      },
      entrega:
        entrega === "retiro"
          ? { tipo: "retiro", notas: s("notas") }
          : {
              tipo: "domicilio",
              calle: s("calle"),
              altura: s("altura"),
              piso_depto: s("piso_depto"),
              codigo_postal: s("codigo_postal"),
              localidad: s("localidad"),
              provincia: s("provincia"),
              notas: s("notas"),
            },
      metodo,
    };
    startTransition(async () => {
      const r = await crearPedido(input);
      if (r.error || !r.url) {
        setError(r.error ?? "No pudimos crear el pedido.");
        return;
      }
      clear();
      if (r.url.startsWith("http")) window.location.href = r.url;
      else router.push(r.url);
    });
  }

  return (
    <form className="checkout" onSubmit={enviar}>
      <div className="checkout-main">
        {avisos.length > 0 && (
          <div className="notice">
            {avisos.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        )}

        <fieldset className="co-box">
          <legend>Datos de contacto</legend>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="nombre">Nombre</label>
              <input id="nombre" name="nombre" required autoComplete="given-name" />
            </div>
            <div className="field">
              <label htmlFor="apellido">Apellido</label>
              <input id="apellido" name="apellido" required autoComplete="family-name" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="telefono">Teléfono (con código de área)</label>
              <input id="telefono" name="telefono" type="tel" required autoComplete="tel" placeholder="11 2345-6789" />
            </div>
            <div className="field">
              <label htmlFor="dni">DNI o CUIT</label>
              <input id="dni" name="dni" required inputMode="numeric" />
            </div>
          </div>
        </fieldset>

        <fieldset className="co-box">
          <legend>Entrega</legend>
          <div className="options">
            <label className={entrega === "domicilio" ? "option active" : "option"}>
              <input type="radio" name="entrega" checked={entrega === "domicilio"} onChange={() => setEntrega("domicilio")} />
              <span>
                <strong>Envío a domicilio</strong>
                <small>
                  {tieneEnvioGratis(subtotal, cfg)
                    ? "Gratis"
                    : cfg.costo_envio == null
                      ? "El costo se coordina después de la compra"
                      : formatPrice(cfg.costo_envio)}
                </small>
              </span>
            </label>
            {cfg.retiro_habilitado && (
              <label className={entrega === "retiro" ? "option active" : "option"}>
                <input type="radio" name="entrega" checked={entrega === "retiro"} onChange={() => setEntrega("retiro")} />
                <span>
                  <strong>Retiro en el local</strong>
                  <small>{cfg.retiro_direccion || "Sin cargo"}</small>
                </span>
              </label>
            )}
          </div>
          {entrega === "domicilio" && (
            <>
              <div className="row2">
                <div className="field">
                  <label htmlFor="calle">Calle</label>
                  <input id="calle" name="calle" required autoComplete="address-line1" />
                </div>
                <div className="field">
                  <label htmlFor="altura">Número</label>
                  <input id="altura" name="altura" required inputMode="numeric" />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="piso_depto">Piso / Depto (opcional)</label>
                  <input id="piso_depto" name="piso_depto" autoComplete="address-line2" />
                </div>
                <div className="field">
                  <label htmlFor="codigo_postal">Código postal</label>
                  <input id="codigo_postal" name="codigo_postal" required autoComplete="postal-code" />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="localidad">Localidad</label>
                  <input id="localidad" name="localidad" required autoComplete="address-level2" />
                </div>
                <div className="field">
                  <label htmlFor="provincia">Provincia</label>
                  <select id="provincia" name="provincia" required defaultValue="">
                    <option value="" disabled>
                      Elegí la provincia
                    </option>
                    {PROVINCIAS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="notas">Notas para la entrega (opcional)</label>
            <textarea id="notas" name="notas" rows={2} maxLength={500} />
          </div>
        </fieldset>

        <fieldset className="co-box">
          <legend>Pago</legend>
          <div className="options">
            <label className={metodo === "transferencia" ? "option active" : "option"}>
              <input type="radio" name="metodo" checked={metodo === "transferencia"} onChange={() => setMetodo("transferencia")} />
              <span>
                <strong>
                  Transferencia bancaria
                  {cfg.transferencia_pct > 0 && <em className="option-tag">{cfg.transferencia_pct}% OFF</em>}
                </strong>
                <small>Te mostramos los datos para transferir al confirmar el pedido.</small>
              </span>
            </label>
            {mpHabilitado && (
              <label className={metodo === "mercadopago" ? "option active" : "option"}>
                <input type="radio" name="metodo" checked={metodo === "mercadopago"} onChange={() => setMetodo("mercadopago")} />
                <span>
                  <strong>Tarjeta de crédito o débito (Mercado Pago)</strong>
                  <small>
                    {cfg.cuotas > 1 ? `Hasta ${cfg.cuotas} cuotas sin interés. ` : ""}Pagás en el sitio seguro de Mercado Pago.
                  </small>
                </span>
              </label>
            )}
          </div>
        </fieldset>
      </div>

      <aside className="checkout-summary">
        <h2>Tu pedido</h2>
        <ul className="co-items">
          {items.map((i) => (
            <li key={i.variantId}>
              <span className="co-img">{i.imagen && <img src={i.imagen} alt="" />}<em>{i.cantidad}</em></span>
              <span className="co-name">
                {i.nombre}
                <small>
                  {i.color}
                  {i.medida !== "Única" && ` · ${i.medida}`}
                </small>
              </span>
              <span className="co-price">{formatPrice(i.precio * i.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="sum-row">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="sum-row sum-discount">
            <span>Descuento transferencia ({pct}%)</span>
            <span>−{formatPrice(descuento)}</span>
          </div>
        )}
        <div className="sum-row">
          <span>Envío</span>
          <span>{envio === 0 ? "Gratis" : envio == null ? "A coordinar" : formatPrice(envio)}</span>
        </div>
        <div className="sum-row sum-total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        {metodo === "mercadopago" && cfg.cuotas > 1 && (
          <div className="sum-cuotas">
            {cfg.cuotas} cuotas sin interés de {formatPrice(total / cfg.cuotas)}
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn btn-solid btn-block" disabled={pending || !listo}>
          {pending ? "Procesando…" : metodo === "mercadopago" ? "Ir a pagar" : "Confirmar pedido"}
        </button>
        <p className="co-legal">
          Al confirmar aceptás las condiciones de <Link href="/ayuda#cambios">cambios y devoluciones</Link>. Los
          precios y el stock se confirman al crear el pedido.
        </p>
      </aside>
    </form>
  );
}
