"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

export function TaxonomiaAdder({
  action,
  placeholder,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  placeholder: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} style={{ marginTop: 14 }}>
      {state.error && <div className="form-error">{state.error}</div>}
      <div className="upload-row">
        <input name="nombre" placeholder={placeholder} required />
        <button type="submit" className="btn btn-sm btn-solid" disabled={pending}>
          {pending ? "…" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
