"use client";

import { useActionState } from "react";
import { ingresar } from "@/lib/actions/auth";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function LoginForm({ next = "/admin" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(ingresar, initialState);

  return (
    <form action={formAction}>
      {state.error && <div className="form-error">{state.error}</div>}
      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
