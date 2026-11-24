"use client";

import { useActionState } from "react";
import { guardarComercial, guardarContacto, guardarTransferencia } from "@/lib/actions/configuracion";
import type { ConfigComercial, ConfigContacto, ConfigTransferencia, FormState } from "@/lib/types";

function Estado({ state }: { state: FormState }) {
  if (state.error) return <div className="form-error">{state.error}</div>;
  if (state.ok) return <div className="form-ok">{state.ok}</div>;
  return null;
}

export function ComercialForm({ cfg }: { cfg: ConfigComercial }) {
  const [state, action, pending] = useActionState(guardarComercial, {});
  return (
    <form action={action} className="admin-form config-card">
      <h2>Condiciones comerciales</h2>
      <p className="hint">Se muestran en la barra de arriba, en las tarjetas y en la ficha de cada producto.</p>
      <Estado state={state} />
      <div className="row2">
        <div className="field">
          <label>Descuento por transferencia (%)</label>
          <input name="transferencia_pct" inputMode="numeric" defaultValue={cfg.transferencia_pct} />
        </div>
        <div className="field">
          <label>Cuotas sin interés (1 = no se muestran)</label>
          <input name="cuotas" inputMode="numeric" defaultValue={cfg.cuotas} />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label>Envío gratis desde ($, vacío = nunca)</label>
          <input name="envio_gratis_desde" inputMode="numeric" defaultValue={cfg.envio_gratis_desde ?? ""} />
        </div>
        <div className="field">
          <label>Costo de envío fijo ($, vacío = a coordinar)</label>
          <input name="costo_envio" inputMode="numeric" defaultValue={cfg.costo_envio ?? ""} />
        </div>
      </div>
      <div className="field checkbox-field">
        <label>
          <input type="checkbox" name="retiro_habilitado" defaultChecked={cfg.retiro_habilitado} /> Permitir retiro en el
          local (sin cargo)
        </label>
      </div>
      <div className="field">
        <label>Dirección de retiro</label>
        <input name="retiro_direccion" defaultValue={cfg.retiro_direccion} />
      </div>
      <p className="hint">
        Las cuotas sin interés tienen que estar activadas en tu cuenta de Mercado Pago: acá solo se informa y se
        limita la cantidad máxima de cuotas.
      </p>
      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

export function ContactoForm({ c }: { c: ConfigContacto }) {
  const [state, action, pending] = useActionState(guardarContacto, {});
  return (
    <form action={action} className="admin-form config-card">
      <h2>Contacto</h2>
      <p className="hint">Aparece en el pie, en Ayuda, en el botón flotante de WhatsApp y en los emails.</p>
      <Estado state={state} />
      <div className="row2">
        <div className="field">
          <label>WhatsApp (con código de país)</label>
          <input name="whatsapp" defaultValue={c.whatsapp} placeholder="+54 9 11 2345 6789" />
        </div>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" defaultValue={c.email} />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label>Instagram (@cuenta)</label>
          <input name="instagram" defaultValue={c.instagram} />
        </div>
        <div className="field">
          <label>Horario de atención</label>
          <input name="horario" defaultValue={c.horario} placeholder="Lunes a viernes de 9 a 18" />
        </div>
      </div>
      <div className="field">
        <label>Dirección</label>
        <input name="direccion" defaultValue={c.direccion} />
      </div>
      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

export function TransferenciaForm({ t }: { t: ConfigTransferencia }) {
  const [state, action, pending] = useActionState(guardarTransferencia, {});
  return (
    <form action={action} className="admin-form config-card">
      <h2>Datos para transferencias</h2>
      <p className="hint">Se muestran al cliente al confirmar un pedido con transferencia y en el email.</p>
      <Estado state={state} />
      <div className="row2">
        <div className="field">
          <label>Titular</label>
          <input name="titular" defaultValue={t.titular} />
        </div>
        <div className="field">
          <label>CUIT</label>
          <input name="cuit" defaultValue={t.cuit} />
        </div>
      </div>
      <div className="field">
        <label>Banco</label>
        <input name="banco" defaultValue={t.banco} />
      </div>
      <div className="row2">
        <div className="field">
          <label>CBU / CVU</label>
          <input name="cbu" inputMode="numeric" defaultValue={t.cbu} />
        </div>
        <div className="field">
          <label>Alias</label>
          <input name="alias" defaultValue={t.alias} />
        </div>
      </div>
      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
