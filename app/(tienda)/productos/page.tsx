import type { Metadata } from "next";
import Link from "next/link";
import { CatalogFilters } from "@/components/catalogo/CatalogFilters";
import { ProductGrid } from "@/components/catalogo/ProductGrid";
import { SortSelect } from "@/components/catalogo/SortSelect";
import {
  getCategories,
  getConfigComercial,
  getLineas,
  getProducts,
  type OrdenListado,
} from "@/lib/queries";

type SP = {
  categoria?: string;
  linea?: string;
  buscar?: string;
  filtro?: string;
  color?: string;
  orden?: string;
  min?: string;
  max?: string;
};

const ORDENES: OrdenListado[] = ["relevancia", "precio-asc", "precio-desc", "nuevos"];

function num(v?: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { categoria, buscar } = await searchParams;
  if (buscar) return { title: `Resultados para "${buscar}"` };
  if (categoria) {
    const cat = (await getCategories()).find((c) => c.slug === categoria);
    if (cat) return { title: cat.nombre };
  }
  return { title: "Todos los productos" };
}

export default async function ProductosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filtro = sp.filtro === "oferta" || sp.filtro === "nuevo" ? sp.filtro : undefined;
  const orden = ORDENES.includes(sp.orden as OrdenListado) ? (sp.orden as OrdenListado) : "relevancia";

  const [cfg, categories, lineas, base, products] = await Promise.all([
    getConfigComercial(),
    getCategories(),
    getLineas(),
    // Base para armar los filtros (colores disponibles) con la categoría/línea elegida
    getProducts({ categorySlug: sp.categoria, linea: sp.linea, buscar: sp.buscar }),
    getProducts({
      categorySlug: sp.categoria,
      linea: sp.linea,
      buscar: sp.buscar,
      filtro,
      color: sp.color,
      precioMin: num(sp.min),
      precioMax: num(sp.max),
      orden,
    }),
  ]);

  const categoria = sp.categoria ? categories.find((c) => c.slug === sp.categoria) : undefined;
  const linea = sp.linea ? lineas.find((l) => l.slug === sp.linea) : undefined;
  const titulo = sp.buscar
    ? `Resultados para "${sp.buscar}"`
    : categoria?.nombre ?? linea?.nombre ?? (filtro === "oferta" ? "Ofertas" : "Todos los productos");

  const colores: { nombre: string; hex: string | null }[] = [];
  for (const p of base)
    for (const c of p.product_colors)
      if (p.etiqueta_color === "Color" && !colores.some((x) => x.nombre.toLowerCase() === c.nombre.toLowerCase()))
        colores.push({ nombre: c.nombre, hex: c.hex });

  return (
    <div className="listing">
      <nav className="crumbs" aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span>›</span>
        <Link href="/productos">Productos</Link>
        {(categoria || linea) && (
          <>
            <span>›</span>
            <span>{categoria?.nombre ?? linea?.nombre}</span>
          </>
        )}
      </nav>
      <div className="listing-head">
        <h1>{titulo}</h1>
        <div className="listing-tools">
          <span className="listing-count">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </span>
          <SortSelect value={orden} />
        </div>
      </div>
      <div className="listing-body">
        <CatalogFilters
          categories={categories}
          lineas={lineas}
          colores={colores}
          activos={{ categoria: sp.categoria, linea: sp.linea, color: sp.color, min: sp.min, max: sp.max, buscar: sp.buscar, orden: sp.orden }}
        />
        <div className="listing-grid">
          <ProductGrid products={products} cfg={cfg} />
        </div>
      </div>
    </div>
  );
}
