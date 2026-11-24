import type { Metadata } from "next";
import { ArrepentimientoForm } from "@/components/checkout/ArrepentimientoForm";

export const metadata: Metadata = { title: "Botón de arrepentimiento" };

export default function ArrepentimientoPage() {
  return (
    <div className="page form-narrow">
      <h1 className="page-title">Botón de arrepentimiento</h1>
      <p className="lead">
        Podés revocar tu compra dentro de los 10 días corridos desde que recibiste el producto o desde la
        compra, lo último que ocurra, sin costo ni responsabilidad (art. 34 de la Ley 24.240 y art. 1110 del
        Código Civil y Comercial). Completá el formulario y te damos un código de solicitud.
      </p>
      <ArrepentimientoForm />
    </div>
  );
}
