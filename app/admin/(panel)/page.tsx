import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { mercadoPagoHabilitado } from "@/lib/mercadopago";
import { getArrepentimientos, getConfigContacto, getConfigTransferencia, getOrders, getProducts } from "@/lib/queries";

export default async function AdminHomePage() {
  const [orders, products, arrep, contacto, transferencia] = await Promise.all([
    getOrders(),
    getProducts({ includeInactive: true }),
    getArrepentimientos(),
    getConfigContacto(),
    getConfigTransferencia(),
  ]);

  const porPagar = orders.filter((o) => o.estado === "pendiente_pago").length;
  const aPreparar = orders.filter((o) => o.estado === "pagado").length;
  const sinAtender = arrep.filter((a) => !a.atendido).length;
  const desde = new Date();
  desde.setDate(1);
  desde.setHours(0, 0, 0, 0);
  const ventasMes = orders
    .filter((o) => ["pagado", "enviado", "entregado"].includes(o.estado) && new Date(o.created_at) >= desde)
    .reduce((s, o) => s + Number(o.total), 0);
  const sinStock = products.filter(
    (p) => p.activo && p.product_colors.every((c) => c.product_variants.every((v) => v.stock === 0))
  ).length;

  const pendientesConfig: string[] = [];
  if (!contacto.whatsapp && !contacto.email) pendientesConfig.push("datos de contacto (WhatsApp / email)");
  if (!transferencia.cbu && !transferencia.alias) pendientesConfig.push("datos bancarios para transferencias");
  if (!mercadoPagoHabilitado()) pendientesConfig.push("Mercado Pago (variables MP_ACCESS_TOKEN y SUPABASE_SERVICE_ROLE_KEY en Vercel)");

  return (
    <>
      <h1>Resumen</h1>
      <div className="stat-row">
        <Link href="/admin/pedidos?estado=pendiente_pago" className="stat" style={{ textDecoration: "none" }}>
          <div className="num">{porPagar}</div>
          <div className="lbl">Esperando pago</div>
        </Link>
        <Link href="/admin/pedidos?estado=pagado" className="stat" style={{ textDecoration: "none" }}>
          <div className="num">{aPreparar}</div>
          <div className="lbl">Pagados para enviar</div>
        </Link>
        <div className="stat">
          <div className="num">{formatPrice(ventasMes)}</div>
          <div className="lbl">Cobrado este mes</div>
        </div>
        <Link href="/admin/productos" className="stat" style={{ textDecoration: "none" }}>
          <div className="num">{products.length}</div>
          <div className="lbl">Productos{sinStock > 0 ? ` (${sinStock} sin stock)` : ""}</div>
        </Link>
        <Link href="/admin/arrepentimientos" className="stat" style={{ textDecoration: "none" }}>
          <div className="num">{sinAtender}</div>
          <div className="lbl">Arrepentimientos sin atender</div>
        </Link>
      </div>
      {pendientesConfig.length > 0 && (
        <div className="notice">
          <strong>Falta configurar:</strong>
          <ul>
            {pendientesConfig.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <Link href="/admin/configuracion">Ir a Configuración</Link>
        </div>
      )}
    </>
  );
}
