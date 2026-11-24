"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  alternarActivo,
  alternarDestacado,
  moverProducto,
  moverProductoAlFrente,
} from "@/lib/actions/productos";
import { InlineName } from "./InlineName";

export interface AdminProductRow {
  id: string;
  sku: string;
  /** URL de la primera foto (miniatura); null si el producto no tiene fotos */
  foto: string | null;
  nombre: string;
  categoria: string;
  linea: string;
  colores: number;
  variantes: number;
  stock: number;
  fotos: number;
  activo: boolean;
  destacado: boolean;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Listado de productos del admin con buscador predictivo (filtra al tipear). */
export function ProductosAdminList({ products }: { products: AdminProductRow[] }) {
  const [query, setQuery] = useState("");

  const destacados = products.filter((p) => p.destacado).length;

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return products;
    return products.filter(
      (p) =>
        norm(p.nombre).includes(q) ||
        norm(p.sku).includes(q) ||
        norm(p.categoria).includes(q) ||
        norm(p.linea).includes(q)
    );
  }, [query, products]);

  return (
    <>
      <div className="field" style={{ maxWidth: 420, marginBottom: 20 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, artículo, categoría o línea…"
          autoFocus
        />
        {query && (
          <p className="upload-hint">
            {filtered.length === 1
              ? "1 producto encontrado"
              : `${filtered.length} productos encontrados`}
          </p>
        )}
      </div>

      <p className="upload-hint" style={{ marginTop: -8, marginBottom: 8 }}>
        Tocá la ★ para elegir qué modelos aparecen en el carrusel “Nuevos ingresos”
        de la home. {destacados === 0
          ? "Sin ninguno elegido, se muestran los más nuevos."
          : `${destacados} destacado${destacados === 1 ? "" : "s"} en la home.`}
      </p>
      <p className="upload-hint" style={{ marginTop: 0, marginBottom: 18 }}>
        Con la columna <strong>Orden</strong> reordenás la galería a mano: ⤒ manda al
        frente, ↑ ↓ suben o bajan de a uno. Los productos nuevos entran al frente
        solos. {query && "Limpiá el buscador para reordenar."}
      </p>

      {filtered.length === 0 ? (
        <div className="empty-note">
          No hay productos que empiecen con “{query}”.
        </div>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Línea</th>
                <th>Colores</th>
                <th>Stock</th>
                <th>Fotos</th>
                <th>Home</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id}>
                  <td>
                    {query ? (
                      <span className="reorder-off">—</span>
                    ) : (
                      <div className="reorder">
                        <form action={moverProductoAlFrente.bind(null, p.id)}>
                          <button
                            type="submit"
                            className="icon-btn"
                            title="Mover al frente"
                            aria-label="Mover al frente"
                          >
                            ⤒
                          </button>
                        </form>
                        <form action={moverProducto.bind(null, p.id, "up")}>
                          <button
                            type="submit"
                            className="icon-btn"
                            title="Subir"
                            aria-label="Subir"
                            disabled={idx === 0}
                          >
                            ↑
                          </button>
                        </form>
                        <form action={moverProducto.bind(null, p.id, "down")}>
                          <button
                            type="submit"
                            className="icon-btn"
                            title="Bajar"
                            aria-label="Bajar"
                            disabled={idx === filtered.length - 1}
                          >
                            ↓
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                  <td>
                    {p.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto} alt="" className="admin-thumb" />
                    ) : (
                      <span className="admin-thumb admin-thumb-empty" aria-hidden>
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <InlineName id={p.id} nombre={p.nombre} />
                  </td>
                  <td>{p.categoria || "—"}</td>
                  <td>{p.linea || "—"}</td>
                  <td>{p.colores}</td>
                  <td className={p.stock === 0 ? "stock-cero" : undefined}>{p.stock}</td>
                  <td>{p.fotos}</td>
                  <td>
                    <form action={alternarDestacado.bind(null, p.id, !p.destacado)}>
                      <button
                        type="submit"
                        className={`star-toggle${p.destacado ? " on" : ""}`}
                        title={
                          p.destacado
                            ? "En la home — tocá para quitar"
                            : "Destacar en la home"
                        }
                        aria-label={
                          p.destacado ? "Quitar de la home" : "Destacar en la home"
                        }
                      >
                        {p.destacado ? "★" : "☆"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <span className={`badge ${p.activo ? "activo" : "inactivo"}`}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <Link href={`/admin/productos/${p.id}`} className="btn btn-sm">
                        Editar
                      </Link>
                      <form action={alternarActivo.bind(null, p.id, !p.activo)}>
                        <button type="submit" className="btn btn-sm">
                          {p.activo ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
