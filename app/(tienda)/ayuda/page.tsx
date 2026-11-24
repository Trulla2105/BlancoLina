import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { mercadoPagoHabilitado } from "@/lib/mercadopago";
import { getConfigComercial, getConfigContacto } from "@/lib/queries";
import { whatsappUrl } from "@/lib/contacto";

export const metadata: Metadata = { title: "Ayuda" };

export default async function AyudaPage() {
  const [cfg, contacto] = await Promise.all([getConfigComercial(), getConfigContacto()]);
  const wa = whatsappUrl(contacto.whatsapp);
  const mp = mercadoPagoHabilitado();

  return (
    <div className="page prose">
      <h1 className="page-title">Ayuda</h1>

      <section id="comprar">
        <h2>Cómo comprar</h2>
        <ol>
          <li>Elegí el producto, el color y la medida, y tocá “Agregar al carrito”.</li>
          <li>Desde el carrito tocá “Iniciar compra” y completá tus datos y la dirección de entrega.</li>
          <li>
            Elegí cómo pagar: transferencia
            {cfg.transferencia_pct > 0 ? ` (con ${cfg.transferencia_pct}% de descuento)` : ""}
            {mp ? " o tarjeta con Mercado Pago" : ""}.
          </li>
          <li>Te llega un email con el detalle y el link para seguir tu pedido.</li>
        </ol>
        <p>No hace falta crear una cuenta.</p>
      </section>

      <section id="pagos">
        <h2>Medios de pago</h2>
        <ul>
          <li>
            <strong>Transferencia bancaria</strong>
            {cfg.transferencia_pct > 0 ? ` con ${cfg.transferencia_pct}% de descuento` : ""}. Al confirmar el
            pedido te mostramos los datos de la cuenta. El pedido se prepara cuando se acredita el pago.
          </li>
          {mp && (
            <li>
              <strong>Tarjetas de crédito y débito</strong> a través de Mercado Pago
              {cfg.cuotas > 1 ? `, hasta ${cfg.cuotas} cuotas sin interés` : ""}.
            </li>
          )}
        </ul>
      </section>

      <section id="envios">
        <h2>Envíos</h2>
        <ul>
          <li>Hacemos envíos a todo el país.</li>
          {cfg.envio_gratis_desde != null && (
            <li>El envío es gratis en compras desde {formatPrice(cfg.envio_gratis_desde)}.</li>
          )}
          <li>
            {cfg.costo_envio == null
              ? "En compras menores, el costo del envío depende de la zona: te contactamos después de la compra para coordinarlo."
              : `En compras menores, el envío cuesta ${formatPrice(cfg.costo_envio)}.`}
          </li>
          {cfg.retiro_habilitado && cfg.retiro_direccion && (
            <li>También podés retirar sin cargo en {cfg.retiro_direccion}.</li>
          )}
        </ul>
      </section>

      <section id="cambios">
        <h2>Cambios y devoluciones</h2>
        <p>
          <strong>Derecho de arrepentimiento.</strong> Por ser una compra a distancia, tenés 10 días corridos
          para revocarla, contados desde que recibiste el producto o desde la compra, lo último que ocurra (art.
          34 de la Ley 24.240 y art. 1110 del Código Civil y Comercial). El producto tiene que volver sin uso y
          en las mismas condiciones en que lo recibiste. Los gastos de devolución quedan a nuestro cargo. Podés
          pedirlo desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link>.
        </p>
        <p>
          <strong>Cambios.</strong> Si querés cambiar el color, la medida o el talle, escribinos con tu número de
          pedido y coordinamos el cambio.
        </p>
      </section>

      <section id="contacto">
        <h2>Contacto</h2>
        <ul>
          {wa && (
            <li>
              WhatsApp:{" "}
              <a href={wa} target="_blank" rel="noopener noreferrer">
                {contacto.whatsapp}
              </a>
            </li>
          )}
          {contacto.email && (
            <li>
              Email: <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
            </li>
          )}
          {contacto.direccion && <li>Dirección: {contacto.direccion}</li>}
          {contacto.horario && <li>Horario: {contacto.horario}</li>}
          {!wa && !contacto.email && <li>Pronto vas a encontrar acá nuestros datos de contacto.</li>}
        </ul>
      </section>
    </div>
  );
}
