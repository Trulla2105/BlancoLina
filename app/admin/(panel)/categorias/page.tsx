import { PaletaManager } from "@/components/admin/PaletaManager";
import { TaxonomiaAdder } from "@/components/admin/TaxonomiaAdder";
import { TaxonomiaImagen } from "@/components/admin/TaxonomiaImagen";
import {
  crearCategoria,
  crearLinea,
  eliminarCategoria,
  eliminarLinea,
  guardarDescripcionLinea,
  moverCategoria,
  moverLinea,
} from "@/lib/actions/taxonomias";
import { getCategories, getLineas, getPaletteColors } from "@/lib/queries";

function Acciones({
  id,
  index,
  total,
  onDelete,
  onMove,
}: {
  id: string;
  index: number;
  total: number;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: "up" | "down") => Promise<void>;
}) {
  return (
    <div className="actions">
      <form action={onMove.bind(null, id, "up")}>
        <button type="submit" className="icon-btn" disabled={index === 0} title="Subir">
          ↑
        </button>
      </form>
      <form action={onMove.bind(null, id, "down")}>
        <button type="submit" className="icon-btn" disabled={index === total - 1} title="Bajar">
          ↓
        </button>
      </form>
      <form action={onDelete.bind(null, id)}>
        <button type="submit" className="btn btn-sm">
          Eliminar
        </button>
      </form>
    </div>
  );
}

export default async function AdminCategoriasPage() {
  const [categories, lineas, paleta] = await Promise.all([getCategories(), getLineas(), getPaletteColors()]);

  return (
    <>
      <h1>Categorías y líneas</h1>
      <p className="upload-hint" style={{ marginBottom: 28 }}>
        Las categorías arman el menú y las tarjetas “Comprá por categoría” de la home (con su foto). Las líneas
        aparecen como banners en la home. Al eliminar una, los productos que la usaban quedan sin esa etiqueta —
        no se borran.
      </p>

      <div className="taxonomia-cols">
        <div className="variant-editor">
          <h2>Categorías</h2>
          {categories.length === 0 ? (
            <div className="empty-note">Todavía no hay ninguna.</div>
          ) : (
            <div className="tax-list">
              {categories.map((c, i) => (
                <div key={c.id} className="tax-row">
                  <strong>{c.nombre}</strong>
                  <TaxonomiaImagen tabla="categories" id={c.id} imagen={c.imagen} />
                  <Acciones id={c.id} index={i} total={categories.length} onDelete={eliminarCategoria} onMove={moverCategoria} />
                </div>
              ))}
            </div>
          )}
          <TaxonomiaAdder action={crearCategoria} placeholder="Nueva categoría" />
        </div>

        <div className="variant-editor">
          <h2>Líneas</h2>
          {lineas.length === 0 ? (
            <div className="empty-note">Todavía no hay ninguna.</div>
          ) : (
            <div className="tax-list">
              {lineas.map((l, i) => (
                <div key={l.id} className="tax-row">
                  <strong>{l.nombre}</strong>
                  <TaxonomiaImagen tabla="lineas" id={l.id} imagen={l.imagen} />
                  <form action={guardarDescripcionLinea} className="upload-row">
                    <input type="hidden" name="id" value={l.id} />
                    <input name="descripcion" defaultValue={l.descripcion ?? ""} placeholder="Bajada del banner" />
                    <button type="submit" className="btn btn-sm">
                      Guardar
                    </button>
                  </form>
                  <Acciones id={l.id} index={i} total={lineas.length} onDelete={eliminarLinea} onMove={moverLinea} />
                </div>
              ))}
            </div>
          )}
          <TaxonomiaAdder action={crearLinea} placeholder="Nueva línea" />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <PaletaManager colores={paleta} />
      </div>
    </>
  );
}
