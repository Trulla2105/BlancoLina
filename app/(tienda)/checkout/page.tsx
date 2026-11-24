import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { mercadoPagoHabilitado } from "@/lib/mercadopago";
import { getConfigComercial } from "@/lib/queries";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage() {
  const cfg = await getConfigComercial();
  return (
    <div className="page">
      <h1 className="page-title">Finalizar compra</h1>
      <CheckoutForm cfg={cfg} mpHabilitado={mercadoPagoHabilitado()} />
    </div>
  );
}
