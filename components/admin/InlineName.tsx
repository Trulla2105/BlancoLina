"use client";

import { useState } from "react";
import { renombrarProducto } from "@/lib/actions/productos";

/** Nombre de producto editable en el listado: guarda al salir del campo o Enter. */
export function InlineName({ id, nombre }: { id: string; nombre: string }) {
  const [valor, setValor] = useState(nombre);
  const [base, setBase] = useState(nombre);
  const [estado, setEstado] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function guardar() {
    const v = valor.trim();
    if (!v) {
      setValor(base);
      return;
    }
    if (v === base) return;
    setEstado("saving");
    const res = await renombrarProducto(id, v);
    if (res.error) {
      setEstado("error");
      setMsg(res.error);
    } else {
      setBase(v);
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 1500);
    }
  }

  return (
    <span className="inline-name">
      <input
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          if (estado !== "idle") setEstado("idle");
        }}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label="Nombre del producto"
      />
      {estado === "saving" && <span className="inline-flag">…</span>}
      {estado === "ok" && <span className="inline-flag ok">✓</span>}
      {estado === "error" && (
        <span className="inline-flag err" title={msg}>
          !
        </span>
      )}
    </span>
  );
}
