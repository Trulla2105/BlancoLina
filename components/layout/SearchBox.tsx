"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/Icons";

/** Buscador del header (estilo caja redondeada con lupa a la derecha). */
export function SearchBox({ className = "searchbox" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/productos?buscar=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={submit} className={className} role="search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="¿Qué estás buscando?"
        aria-label="Buscar productos"
        enterKeyHint="search"
      />
      <button type="submit" aria-label="Buscar">
        <SearchIcon size={17} />
      </button>
    </form>
  );
}
