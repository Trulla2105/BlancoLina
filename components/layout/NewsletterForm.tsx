"use client";

import { useActionState } from "react";
import { suscribirNewsletter } from "@/lib/actions/tienda";
import type { FormState } from "@/lib/types";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(suscribirNewsletter, {});
  return (
    <form action={action} className="newsletter">
      <div className="newsletter-row">
        <input name="email" type="email" required placeholder="Tu email" aria-label="Tu email" />
        <button type="submit" disabled={pending}>
          {pending ? "…" : "Enviar"}
        </button>
      </div>
      {state.ok && <p className="newsletter-ok">{state.ok}</p>}
      {state.error && <p className="newsletter-err">{state.error}</p>}
    </form>
  );
}
