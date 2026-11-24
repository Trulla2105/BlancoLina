import Link from "next/link";
import { MailIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappUrl } from "@/lib/contacto";
import type { ConfigContacto } from "@/lib/types";

/** "¿Cómo podemos ayudarte?" con botones de WhatsApp y email. */
export function HelpSection({ contacto }: { contacto: ConfigContacto }) {
  const wa = whatsappUrl(contacto.whatsapp, "¡Hola! Tengo una consulta sobre un producto.");
  return (
    <section className="help">
      <h2>¿Cómo podemos ayudarte?</h2>
      <p>
        Estamos para ayudarte a elegir, resolver tus dudas sobre medidas, materiales o envíos y
        acompañarte en tu compra. Escribinos y te respondemos a la brevedad.
      </p>
      <div className="help-actions">
        {wa && (
          <a href={wa} className="btn-outline-pill" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={16} /> Escribinos por WhatsApp
          </a>
        )}
        {contacto.email && (
          <a href={`mailto:${contacto.email}`} className="btn-outline-pill">
            <MailIcon size={16} /> {contacto.email}
          </a>
        )}
        {!wa && !contacto.email && (
          <Link href="/ayuda" className="btn-outline-pill">
            Ver preguntas frecuentes
          </Link>
        )}
      </div>
    </section>
  );
}
