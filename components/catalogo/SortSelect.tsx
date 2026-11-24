"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPCIONES = [
  { value: "relevancia", label: "Destacados" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nuevos", label: "Más nuevos" },
];

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="sort">
      <span>Ordenar por</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "relevancia") next.delete("orden");
          else next.set("orden", e.target.value);
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
