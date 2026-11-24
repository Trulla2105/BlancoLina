import { ComercialForm, ContactoForm, TransferenciaForm } from "@/components/admin/ConfigForms";
import { mercadoPagoHabilitado } from "@/lib/mercadopago";
import { getConfigComercial, getConfigContacto, getConfigTransferencia } from "@/lib/queries";

export default async function ConfiguracionPage() {
  const [cfg, contacto, transferencia] = await Promise.all([
    getConfigComercial(),
    getConfigContacto(),
    getConfigTransferencia(),
  ]);
  return (
    <>
      <h1>Configuración</h1>
      <div className="config-grid">
        <ComercialForm cfg={cfg} />
        <TransferenciaForm t={transferencia} />
        <ContactoForm c={contacto} />
        <div className="config-card">
          <h2>Mercado Pago</h2>
          {mercadoPagoHabilitado() ? (
            <p>Activo: los clientes pueden pagar con tarjeta. Los pagos aprobados marcan el pedido como pagado solo.</p>
          ) : (
            <p className="hint">
              Inactivo. Para activarlo hay que cargar en Vercel las variables MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET y
              SUPABASE_SERVICE_ROLE_KEY (ver docs/puesta-en-marcha.md del repositorio). Mientras tanto la tienda
              cobra solo por transferencia.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
