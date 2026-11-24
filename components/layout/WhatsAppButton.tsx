import { WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappUrl } from "@/lib/contacto";

/** Botón flotante de WhatsApp (solo si hay número cargado en el panel). */
export function WhatsAppButton({ numero }: { numero: string }) {
  const url = whatsappUrl(numero, "¡Hola! Tengo una consulta.");
  if (!url) return null;
  return (
    <a href={url} className="wa-float" target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp">
      <WhatsAppIcon size={28} />
    </a>
  );
}
