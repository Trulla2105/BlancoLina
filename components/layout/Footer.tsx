import Link from "next/link";
import { InstagramIcon, MailIcon, MapPinIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { mercadoPagoHabilitado } from "@/lib/mercadopago";
import { getCategories, getConfigContacto } from "@/lib/queries";
import { DEFENSA_CONSUMIDOR_URL, SITE } from "@/lib/site";
import { instagramUrl, whatsappUrl } from "@/lib/contacto";
import { NewsletterForm } from "./NewsletterForm";

export async function Footer() {
  const [categories, contacto] = await Promise.all([getCategories(), getConfigContacto()]);
  const wa = whatsappUrl(contacto.whatsapp);
  const ig = instagramUrl(contacto.instagram);
  const medios = [
    "Transferencia",
    ...(mercadoPagoHabilitado()
      ? ["Mercado Pago", "Visa", "Mastercard", "American Express", "Naranja", "Cabal"]
      : []),
  ];

  return (
    <footer className="site-footer">
      <div className="footer-cols">
        <div className="footer-col footer-news">
          <h3>Dejanos tu mail y recibí promociones exclusivas</h3>
          <p>¡No te pierdas de nada!</p>
          <NewsletterForm />
        </div>

        <div className="footer-col">
          <h3>Categorías</h3>
          <ul>
            <li>
              <Link href="/productos">Ver todo</Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/productos?categoria=${c.slug}`}>{c.nombre}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h3>Ayuda</h3>
          <ul>
            <li>
              <Link href="/ayuda">Cómo comprar</Link>
            </li>
            <li>
              <Link href="/ayuda#pagos">Medios de pago</Link>
            </li>
            <li>
              <Link href="/ayuda#envios">Envíos</Link>
            </li>
            <li>
              <Link href="/ayuda#cambios">Cambios y devoluciones</Link>
            </li>
            <li>
              <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>¡Hablemos!</h3>
          <ul className="footer-contact">
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon size={15} /> {contacto.whatsapp}
                </a>
              </li>
            )}
            {contacto.email && (
              <li>
                <a href={`mailto:${contacto.email}`}>
                  <MailIcon size={15} /> {contacto.email}
                </a>
              </li>
            )}
            {contacto.direccion && (
              <li>
                <span>
                  <MapPinIcon size={15} /> {contacto.direccion}
                </span>
              </li>
            )}
            {contacto.horario && (
              <li>
                <span className="footer-muted">{contacto.horario}</span>
              </li>
            )}
            {ig && (
              <li>
                <a href={ig} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon size={15} /> Instagram
                </a>
              </li>
            )}
            {!wa && !contacto.email && !contacto.direccion && (
              <li>
                <Link href="/ayuda">Escribinos desde la sección de ayuda</Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-pay">
          <h4>Medios de pago</h4>
          <div className="pay-chips">
            {medios.map((m) => (
              <span key={m} className="pay-chip">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="footer-legal">
          <p>
            Defensa de las y los consumidores. Para reclamos{" "}
            <a href={DEFENSA_CONSUMIDOR_URL} target="_blank" rel="noopener noreferrer">
              ingresá acá
            </a>
            . / <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
          </p>
          <p>
            © {new Date().getFullYear()} {SITE.nombre} · {SITE.bajada}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
