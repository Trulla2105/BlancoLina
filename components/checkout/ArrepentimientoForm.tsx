"use client";

import { useActionState } from "react";
import { solicitarArrepentimiento, type ArrepentimientoState } from "@/lib/actions/tienda";

export function ArrepentimientoForm() {
  const [state, action, pending] = useActionState<ArrepentimientoState, FormData>(solicitarArrepentimiento, {});

  if (state.codigo) {
    return (
      <div className="status-box">
        <span className="status-label">Solicitud registrada</span>
        <p>
          Tu código es <strong>{state.codigo}</strong>. También te lo enviamos por email. Te vamos a contactar
          para coordinar la devolución.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="store-form">
      {state.error && <div className="form-error">{state.error}</div>}
      <div className="field">
        <label htmlFor="nombre">Nombre y apellido</label>
        <input id="nombre" name="nombre" required autoComplete="name" />
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" name="telefono" type="tel" autoComplete="tel" />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="numero_pedido">Número de pedido</label>
          <input id="numero_pedido" name="numero_pedido" inputMode="numeric" placeholder="Ej.: 1024" />
        </div>
        <div className="field">
          <label htmlFor="dni">DNI</label>
          <input id="dni" name="dni" inputMode="numeric" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="motivo">Comentario (opcional)</label>
        <textarea id="motivo" name="motivo" rows={3} maxLength={1000} />
      </div>
      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
