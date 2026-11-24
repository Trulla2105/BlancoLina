"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  eliminarProducto,
  guardarProductoCompleto,
  setColorFoto,
  type ColorInput,
} from "@/lib/actions/productos";
import { PALETA_COLORES } from "@/lib/colores";
import { publicImageUrl } from "@/lib/supabase/env";
import type { Category, Linea, PaletteColor, Product } from "@/lib/types";
import { uploadImages } from "@/lib/upload";

type VariantRow = {
  key: string;
  id: string | null;
  medida: string;
  stock: string;
  precio: string;
  oferta: string;
};
type ColorRow = {
  key: string;
  id: string | null;
  nombre: string;
  hex: string | null;
  foto: string | null;
  variants: VariantRow[];
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

function toColorRows(product: Product): ColorRow[] {
  return product.product_colors.map((c) => ({
    key: c.id,
    id: c.id,
    nombre: c.nombre,
    hex: c.hex,
    foto: c.foto,
    variants: c.product_variants.map((v) => ({
      key: v.id,
      id: v.id,
      medida: v.medida,
      stock: String(v.stock),
      precio: String(v.precio),
      oferta: v.precio_oferta != null ? String(v.precio_oferta) : "",
    })),
  }));
}

export function ProductEditor({
  product,
  categories,
  lineas,
  paleta,
}: {
  product: Product;
  categories: Category[];
  lineas: Linea[];
  paleta: PaletteColor[];
}) {
  const router = useRouter();

  const grupos = [
    ...(paleta.length > 0
      ? [{ grupo: "Paleta de la tienda", colores: paleta.map((p) => ({ nombre: p.nombre, hex: p.hex })) }]
      : []),
    ...PALETA_COLORES,
  ];

  const [nombre, setNombre] = useState(product.nombre);
  const [sku, setSku] = useState(product.sku);
  const [categoryId, setCategoryId] = useState(product.categories?.id ?? "");
  const [linea, setLinea] = useState(product.linea ?? "");
  const [marca, setMarca] = useState(product.marca ?? "");
  const [etiquetaColor, setEtiquetaColor] = useState(product.etiqueta_color);
  const [etiquetaMedida, setEtiquetaMedida] = useState(product.etiqueta_medida);
  const [descripcion, setDescripcion] = useState(product.descripcion ?? "");
  const [activo, setActivo] = useState(product.activo);
  const [destacado, setDestacado] = useState(product.destacado);
  const [ocultarNuevo, setOcultarNuevo] = useState(product.ocultar_nuevo);
  const [colors, setColors] = useState<ColorRow[]>(toColorRows(product));
  const [deletedColorIds, setDeletedColorIds] = useState<string[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [paletaAbierta, setPaletaAbierta] = useState<string | null>(null);
  const [bulkPrecio, setBulkPrecio] = useState("");
  const [bulkOferta, setBulkOferta] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null);

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        nombre, sku, categoryId, linea, marca, etiquetaColor, etiquetaMedida, descripcion,
        activo, destacado, ocultarNuevo,
        colors: colors.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          hex: c.hex,
          variants: c.variants.map((v) => ({ id: v.id, medida: v.medida, stock: v.stock, precio: v.precio, oferta: v.oferta })),
        })),
        deletedColorIds,
        deletedVariantIds,
      }),
    [nombre, sku, categoryId, linea, marca, etiquetaColor, etiquetaMedida, descripcion, activo, destacado, ocultarNuevo, colors, deletedColorIds, deletedVariantIds]
  );
  const initial = useRef(snapshot);
  const dirty = snapshot !== initial.current;

  // Aviso del navegador al cerrar/recargar con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function touch() {
    setOk(null);
  }

  // --- colores ---
  function addColor() {
    const medidasExistentes = colors[0]?.variants.map((v) => v.medida) ?? ["Única"];
    const precioBase = colors[0]?.variants[0]?.precio ?? "";
    setColors((cs) => [
      ...cs,
      {
        key: uid(),
        id: null,
        nombre: "",
        hex: null,
        foto: null,
        variants: (medidasExistentes.length ? medidasExistentes : ["Única"]).map((m) => ({
          key: uid(),
          id: null,
          medida: m,
          stock: "0",
          precio: precioBase,
          oferta: "",
        })),
      },
    ]);
    touch();
  }
  function removeColor(idx: number) {
    setColors((cs) => {
      const c = cs[idx];
      if (c.id) setDeletedColorIds((d) => [...d, c.id as string]);
      return cs.filter((_, i) => i !== idx);
    });
    touch();
  }
  function setColorField(idx: number, patch: Partial<ColorRow>) {
    setColors((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    touch();
  }
  function pickColor(idx: number, nombreColor: string, hex: string) {
    setColors((cs) =>
      cs.map((c, i) => (i === idx ? { ...c, hex, nombre: c.nombre.trim() ? c.nombre : nombreColor } : c))
    );
    setPaletaAbierta(null);
    touch();
  }

  async function subirFotoColor(ci: number, file: File | undefined) {
    const color = colors[ci];
    if (!file || !color.id) return;
    setSubiendoFoto(color.key);
    setError(null);
    const { paths, errors } = await uploadImages([file], `${product.id}/colores`, undefined, 1200);
    if (paths[0]) {
      const r = await setColorFoto(color.id, product.id, paths[0]);
      if (r.error) errors.push(r.error);
      else setColors((cs) => cs.map((c, i) => (i === ci ? { ...c, foto: paths[0] } : c)));
    }
    setSubiendoFoto(null);
    if (errors.length) setError(errors.join(" · "));
  }
  async function quitarFotoColor(ci: number) {
    const color = colors[ci];
    if (!color.id) return;
    const r = await setColorFoto(color.id, product.id, null);
    if (r.error) setError(r.error);
    else setColors((cs) => cs.map((c, i) => (i === ci ? { ...c, foto: null } : c)));
  }

  // --- carga masiva ---
  function aplicarATodos() {
    const precio = bulkPrecio.trim();
    const oferta = bulkOferta.trim();
    const stock = bulkStock.trim();
    if (precio === "" && oferta === "" && stock === "") {
      setError("Escribí precio, oferta o stock para aplicar a todas las variantes.");
      return;
    }
    setError(null);
    setColors((cs) =>
      cs.map((c) => ({
        ...c,
        variants: c.variants.map((v) => ({
          ...v,
          precio: precio !== "" ? precio : v.precio,
          oferta: oferta !== "" ? (oferta === "0" ? "" : oferta) : v.oferta,
          stock: stock !== "" ? stock : v.stock,
        })),
      }))
    );
    touch();
  }

  // --- variantes ---
  function addVariant(ci: number) {
    setColors((cs) =>
      cs.map((c, i) =>
        i === ci
          ? {
              ...c,
              variants: [
                ...c.variants,
                { key: uid(), id: null, medida: "", stock: "0", precio: c.variants[0]?.precio ?? "", oferta: "" },
              ],
            }
          : c
      )
    );
    touch();
  }
  function removeVariant(ci: number, vi: number) {
    setColors((cs) =>
      cs.map((c, i) => {
        if (i !== ci) return c;
        const v = c.variants[vi];
        if (v.id) setDeletedVariantIds((d) => [...d, v.id as string]);
        return { ...c, variants: c.variants.filter((_, j) => j !== vi) };
      })
    );
    touch();
  }
  function setVariantField(ci: number, vi: number, patch: Partial<VariantRow>) {
    setColors((cs) =>
      cs.map((c, i) =>
        i === ci ? { ...c, variants: c.variants.map((v, j) => (j === vi ? { ...v, ...patch } : v)) } : c
      )
    );
    touch();
  }

  async function guardar() {
    setBusy(true);
    setError(null);
    setOk(null);
    const payloadColors: ColorInput[] = colors.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      hex: c.hex,
      variants: c.variants.map((v) => ({
        id: v.id,
        medida: v.medida,
        stock: Number(v.stock || 0),
        precio: Number(v.precio || 0),
        oferta: v.oferta.trim() === "" ? null : Number(v.oferta),
      })),
    }));
    const res = await guardarProductoCompleto(
      product.id,
      { nombre, sku, categoryId, marca, linea, descripcion, etiquetaColor, etiquetaMedida, activo, destacado, ocultarNuevo },
      payloadColors,
      deletedColorIds,
      deletedVariantIds
    );
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    initial.current = snapshot;
    setDeletedColorIds([]);
    setDeletedVariantIds([]);
    setOk(res.ok ?? "Cambios guardados.");
    router.refresh();
  }

  return (
    <>
      {/* Barra sticky con título + acciones */}
      <div className="editor-bar">
        <div className="editor-bar-title">
          <span className="editor-sku">{sku || "—"}</span>
          <span className="editor-nombre">{nombre || "Producto sin nombre"}</span>
        </div>
        <div className="editor-bar-actions">
          <a href={`/productos/${product.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
            Vista previa ↗
          </a>
          <form
            action={eliminarProducto.bind(null, product.id)}
            onSubmit={(e) => {
              if (!confirm("¿Eliminar este producto? No se puede deshacer. Si ya tiene ventas, mejor desactivalo.")) {
                e.preventDefault();
              }
            }}
          >
            <button type="submit" className="btn btn-sm">
              Eliminar
            </button>
          </form>
          <button type="button" className="btn btn-sm btn-solid" disabled={!dirty || busy} onClick={guardar}>
            {busy ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {ok && <div className="form-ok">{ok}</div>}

      {/* Datos generales */}
      <div className="admin-form">
        <div className="row2">
          <div className="field">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => { setNombre(e.target.value); touch(); }} />
          </div>
          <div className="field">
            <label>Artículo / SKU</label>
            <input value={sku} onChange={(e) => { setSku(e.target.value); touch(); }} />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label>Categoría</label>
            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); touch(); }}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Línea</label>
            <select value={linea} onChange={(e) => { setLinea(e.target.value); touch(); }}>
              <option value="">Sin línea</option>
              {lineas.map((l) => (
                <option key={l.id} value={l.slug}>{l.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label>Marca</label>
            <input value={marca} onChange={(e) => { setMarca(e.target.value); touch(); }} />
          </div>
          <div className="row2">
            <div className="field">
              <label>Nombre del 1.er eje</label>
              <input value={etiquetaColor} placeholder="Color" onChange={(e) => { setEtiquetaColor(e.target.value); touch(); }} />
            </div>
            <div className="field">
              <label>Nombre del 2.º eje</label>
              <input value={etiquetaMedida} placeholder="Medida" onChange={(e) => { setEtiquetaMedida(e.target.value); touch(); }} />
            </div>
          </div>
        </div>
        <div className="field">
          <label>Descripción</label>
          <textarea rows={4} value={descripcion} onChange={(e) => { setDescripcion(e.target.value); touch(); }} />
        </div>
        <div className="checks">
          <label>
            <input type="checkbox" checked={activo} onChange={(e) => { setActivo(e.target.checked); touch(); }} />
            Activo (visible en la tienda)
          </label>
          <label>
            <input type="checkbox" checked={destacado} onChange={(e) => { setDestacado(e.target.checked); touch(); }} />
            Destacado en la home (“Los imperdibles”)
          </label>
          <label>
            <input type="checkbox" checked={ocultarNuevo} onChange={(e) => { setOcultarNuevo(e.target.checked); touch(); }} />
            No mostrar el cartel “Nuevo”
          </label>
        </div>
      </div>

      {/* Colores y medidas */}
      <div className="variant-editor">
        <h2>
          {etiquetaColor || "Color"}, {(etiquetaMedida || "Medida").toLowerCase()}, precio y stock
        </h2>
        <p className="upload-hint">
          Cada {(etiquetaColor || "color").toLowerCase()} tiene sus {(etiquetaMedida || "medida").toLowerCase()}s con
          precio y stock. Si el producto no tiene {(etiquetaMedida || "medida").toLowerCase()}s, dejá una sola fila
          “Única”. La oferta es opcional (precio rebajado). Guardá todo con el botón de arriba.
        </p>

        <div className="bulk-price">
          <div className="bulk-price-inputs">
            <input type="number" min={0} value={bulkPrecio} onChange={(e) => setBulkPrecio(e.target.value)} placeholder="Precio" />
            <input type="number" min={0} value={bulkOferta} onChange={(e) => setBulkOferta(e.target.value)} placeholder="Oferta (0 = quitar)" />
            <input type="number" min={0} value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} placeholder="Stock" />
          </div>
          <div className="bulk-price-btns">
            <button type="button" className="btn btn-sm" onClick={aplicarATodos}>
              Aplicar a todas las variantes
            </button>
          </div>
        </div>

        {colors.map((color, ci) => (
          <div className="color-block" key={color.key}>
            <div className="color-head">
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="color-chip-btn"
                  style={{ background: color.hex ?? "var(--off)" }}
                  onClick={() => setPaletaAbierta(paletaAbierta === color.key ? null : color.key)}
                  title="Elegir color"
                >
                  {!color.hex && <span>?</span>}
                </button>
                {paletaAbierta === color.key && (
                  <div className="paleta-pop">
                    {grupos.map((g) => (
                      <div key={g.grupo} className="paleta-grupo">
                        <span className="paleta-grupo-nombre">{g.grupo}</span>
                        <div className="paleta-grid">
                          {g.colores.map((c) => (
                            <button
                              key={`${g.grupo}-${c.hex}-${c.nombre}`}
                              type="button"
                              className="paleta-swatch"
                              style={{ background: c.hex }}
                              title={c.nombre}
                              onClick={() => pickColor(ci, c.nombre, c.hex)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                className="color-name-input"
                value={color.nombre}
                placeholder={`Nombre (${(etiquetaColor || "color").toLowerCase()})`}
                onChange={(e) => setColorField(ci, { nombre: e.target.value })}
              />
              <div className="color-foto">
                {color.foto ? (
                  <>
                    <img src={publicImageUrl(color.foto)} alt="" />
                    <button type="button" className="icon-btn" title="Quitar foto" onClick={() => quitarFotoColor(ci)}>
                      ✕
                    </button>
                  </>
                ) : color.id ? (
                  <label className="btn btn-sm">
                    {subiendoFoto === color.key ? "Subiendo…" : "Foto"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => subirFotoColor(ci, e.target.files?.[0])}
                    />
                  </label>
                ) : (
                  <span className="upload-hint" style={{ margin: 0 }}>Foto: guardá primero</span>
                )}
              </div>
              <button type="button" className="btn btn-sm" onClick={() => removeColor(ci)}>
                Eliminar
              </button>
            </div>

            <div className="color-variants">
              {color.variants.map((v, vi) => (
                <div className="cve-row" key={v.key}>
                  <label className="cve-cell cve-talle">
                    <span className="cve-lbl">{etiquetaMedida || "Medida"}</span>
                    <input value={v.medida} placeholder="Única" onChange={(e) => setVariantField(ci, vi, { medida: e.target.value })} />
                  </label>
                  <label className="cve-cell cve-stock">
                    <span className="cve-lbl">Stock</span>
                    <input type="number" min={0} value={v.stock} onChange={(e) => setVariantField(ci, vi, { stock: e.target.value })} />
                  </label>
                  <label className="cve-cell cve-precio">
                    <span className="cve-lbl">Precio</span>
                    <input type="number" min={0} value={v.precio} placeholder="0" onChange={(e) => setVariantField(ci, vi, { precio: e.target.value })} />
                  </label>
                  <label className="cve-cell cve-oferta">
                    <span className="cve-lbl">Oferta (opc.)</span>
                    <input type="number" min={0} value={v.oferta} placeholder="—" onChange={(e) => setVariantField(ci, vi, { oferta: e.target.value })} />
                  </label>
                  <button type="button" className="icon-btn cve-del" title="Quitar" onClick={() => removeVariant(ci, vi)}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => addVariant(ci)} style={{ marginTop: 6 }}>
                + Agregar {(etiquetaMedida || "medida").toLowerCase()}
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-sm btn-solid" onClick={addColor}>
          + Agregar {(etiquetaColor || "color").toLowerCase()}
        </button>
      </div>
    </>
  );
}
