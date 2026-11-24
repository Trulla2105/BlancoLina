import { createClient } from "@/lib/supabase/server";
import { precioVariante } from "@/lib/precios";
import {
  ANON_VIEWER,
  DEFAULT_COMERCIAL,
  DEFAULT_CONTACTO,
  DEFAULT_TRANSFERENCIA,
  type Arrepentimiento,
  type Category,
  type ConfigComercial,
  type ConfigContacto,
  type ConfigTransferencia,
  type HeroBanner,
  type InstagramPost,
  type Linea,
  type Order,
  type PaletteColor,
  type PedidoPublico,
  type Product,
  type Viewer,
} from "@/lib/types";

const PRODUCT_SELECT = `
  id, nombre, sku, slug, marca, descripcion, linea, etiqueta_color, etiqueta_medida,
  activo, destacado, ocultar_nuevo, orden, created_at,
  categories ( id, nombre, slug ),
  product_colors ( id, nombre, hex, foto, orden,
    product_variants ( id, color_id, medida, precio, precio_oferta, stock ) ),
  product_images ( id, url, orden )
`;

const ORDEN_TALLES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"];

/**
 * Ordena las medidas de un producto: si TODAS son talles de ropa (XS…XXL)
 * van en ese orden; si no (letras, medidas en cm), orden natural. Decidirlo
 * por el conjunto evita mezclar criterios (A…Z también tiene "L", "M" y "S").
 */
export function ordenarMedidas(medidas: string[]): string[] {
  const todasTalles = medidas.every((m) => ORDEN_TALLES.includes(m.toUpperCase()));
  return [...medidas].sort((a, b) =>
    todasTalles
      ? ORDEN_TALLES.indexOf(a.toUpperCase()) - ORDEN_TALLES.indexOf(b.toUpperCase())
      : a.localeCompare(b, "es", { numeric: true })
  );
}

/** Ordena colores, variantes e imágenes (el orden anidado se resuelve acá). */
function normalizeProduct(product: Product): Product {
  product.product_colors.sort((a, b) => a.orden - b.orden);
  const medidas = Array.from(
    new Set(product.product_colors.flatMap((c) => c.product_variants.map((v) => v.medida)))
  );
  const posicion = new Map(ordenarMedidas(medidas).map((m, i) => [m, i]));
  for (const color of product.product_colors) {
    for (const v of color.product_variants) {
      v.precio = Number(v.precio);
      v.precio_oferta = v.precio_oferta == null ? null : Number(v.precio_oferta);
    }
    color.product_variants.sort(
      (a, b) => (posicion.get(a.medida) ?? 0) - (posicion.get(b.medida) ?? 0)
    );
  }
  product.product_images.sort((a, b) => a.orden - b.orden);
  return product;
}

/**
 * Las consultas públicas nunca deben tirar abajo la página: ante cualquier
 * error (config incompleta, red, esquema sin migrar) devuelven el fallback
 * y dejan el detalle en los logs del servidor.
 */
async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("[hogar-lina] error consultando Supabase:", error);
    return fallback;
  }
}

export function getCategories(): Promise<Category[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("categories")
      .select("id, nombre, slug, imagen, orden")
      .order("orden");
    return (data as Category[]) ?? [];
  });
}

export function getLineas(): Promise<Linea[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("lineas")
      .select("id, nombre, slug, descripcion, imagen, orden")
      .order("orden");
    return (data as Linea[]) ?? [];
  });
}

const NEW_DAYS = 30;

export type OrdenListado = "relevancia" | "precio-asc" | "precio-desc" | "nuevos";

function precioMinimo(p: Product): number {
  const vs = p.product_colors.flatMap((c) => c.product_variants);
  if (vs.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...vs.map(precioVariante));
}

export function getProducts(opts?: {
  categorySlug?: string;
  linea?: string;
  buscar?: string;
  /** "oferta": con precio de oferta · "nuevo": cargados en los últimos 30 días */
  filtro?: "oferta" | "nuevo";
  /** nombre de color (exacto, sin distinguir mayúsculas) */
  color?: string;
  precioMin?: number;
  precioMax?: number;
  destacado?: boolean;
  orden?: OrdenListado;
  limit?: number;
  excluirId?: string;
  includeInactive?: boolean;
}): Promise<Product[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];

    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .order("orden", { ascending: false })
      .order("created_at", { ascending: false });

    if (!opts?.includeInactive) query = query.eq("activo", true);
    if (opts?.destacado) query = query.eq("destacado", true);
    if (opts?.linea) query = query.eq("linea", opts.linea);
    if (opts?.excluirId) query = query.neq("id", opts.excluirId);
    if (opts?.buscar) {
      // Solo letras, números y espacios para no romper el filtro .or()
      const term = opts.buscar.replace(/[%,()*\\]/g, " ").trim();
      if (term) {
        query = query.or(
          `nombre.ilike.%${term}%,sku.ilike.%${term}%,marca.ilike.%${term}%,descripcion.ilike.%${term}%`
        );
      }
    }
    if (opts?.filtro === "nuevo") {
      const cutoff = new Date(Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000);
      query = query.gte("created_at", cutoff.toISOString());
    }
    if (opts?.categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", opts.categorySlug)
        .maybeSingle();
      if (!cat) return [];
      query = query.eq("category_id", cat.id);
    }

    const { data } = await query;
    let products = ((data as unknown as Product[]) ?? []).map(normalizeProduct);

    // Filtros que dependen de las variantes: se resuelven acá (catálogo chico).
    if (opts?.filtro === "oferta") {
      products = products.filter((p) =>
        p.product_colors.some((c) => c.product_variants.some((v) => v.precio_oferta != null))
      );
    }
    if (opts?.color) {
      const buscado = opts.color.toLowerCase();
      products = products.filter((p) =>
        p.product_colors.some((c) => c.nombre.toLowerCase() === buscado)
      );
    }
    if (opts?.precioMin != null || opts?.precioMax != null) {
      const min = opts.precioMin ?? 0;
      const max = opts.precioMax ?? Number.POSITIVE_INFINITY;
      products = products.filter((p) => {
        const precio = precioMinimo(p);
        return precio >= min && precio <= max;
      });
    }
    if (opts?.orden === "precio-asc") {
      products.sort((a, b) => precioMinimo(a) - precioMinimo(b));
    } else if (opts?.orden === "precio-desc") {
      products.sort((a, b) => precioMinimo(b) - precioMinimo(a));
    } else if (opts?.orden === "nuevos") {
      products.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    return opts?.limit ? products.slice(0, opts.limit) : products;
  });
}

export function getProductBySlug(slug: string): Promise<Product | null> {
  return safe(null, async () => {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .maybeSingle();
    return data ? normalizeProduct(data as unknown as Product) : null;
  });
}

export function getProductById(id: string): Promise<Product | null> {
  return safe(null, async () => {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .maybeSingle();
    return data ? normalizeProduct(data as unknown as Product) : null;
  });
}

/** Quién está mirando: solo importa para el panel (la tienda no tiene cuentas). */
export function getViewer(): Promise<Viewer> {
  return safe(ANON_VIEWER, async () => {
    const supabase = await createClient();
    if (!supabase) return ANON_VIEWER;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return ANON_VIEWER;

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    return { userId: user.id, email: user.email ?? null, isAdmin: Boolean(adminRow) };
  });
}

/** Banners del carrusel de la home. RLS: el público solo ve los activos. */
export function getHeroBanners(): Promise<HeroBanner[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("hero_banners")
      .select("id, url, url_mobile, titulo, subtitulo, boton, link, orden, activo")
      .order("orden");
    return (data as HeroBanner[]) ?? [];
  });
}

async function getSetting<T extends object>(key: string, fallback: T): Promise<T> {
  return safe(fallback, async () => {
    const supabase = await createClient();
    if (!supabase) return fallback;
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return { ...fallback, ...((data?.value as Partial<T> | undefined) ?? {}) };
  });
}

export async function getConfigComercial(): Promise<ConfigComercial> {
  const cfg = await getSetting<ConfigComercial>("comercial", DEFAULT_COMERCIAL);
  const numOrNull = (v: unknown) =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
  return {
    transferencia_pct: Math.max(0, Math.min(100, Number(cfg.transferencia_pct) || 0)),
    cuotas: Math.max(1, Math.floor(Number(cfg.cuotas) || 1)),
    envio_gratis_desde: numOrNull(cfg.envio_gratis_desde),
    costo_envio: numOrNull(cfg.costo_envio),
    retiro_habilitado: Boolean(cfg.retiro_habilitado),
    retiro_direccion: String(cfg.retiro_direccion ?? ""),
  };
}

export function getConfigContacto(): Promise<ConfigContacto> {
  return getSetting<ConfigContacto>("contacto", DEFAULT_CONTACTO);
}

export function getConfigTransferencia(): Promise<ConfigTransferencia> {
  return getSetting<ConfigTransferencia>("transferencia", DEFAULT_TRANSFERENCIA);
}

export function getPaletteColors(): Promise<PaletteColor[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("palette_colors")
      .select("id, nombre, hex, orden")
      .order("orden");
    return (data as PaletteColor[]) ?? [];
  });
}

/** Código embed del widget de Instagram (vacío si no está configurado). */
export function getInstagramEmbed(): Promise<string> {
  return safe("", async () => {
    const supabase = await createClient();
    if (!supabase) return "";
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "instagram_embed")
      .maybeSingle();
    const value = data?.value as { html?: string } | undefined;
    return value?.html?.trim() ?? "";
  });
}

export function getInstagramPosts(): Promise<InstagramPost[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("instagram_posts")
      .select("id, imagen, link, orden")
      .order("orden");
    return (data as InstagramPost[]) ?? [];
  });
}

/** Ids de los productos más vendidos (pedidos cobrados), del más al menos vendido. */
export function getMasVendidosIds(limit = 12): Promise<string[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data, error } = await supabase.rpc("productos_mas_vendidos", { p_limit: limit });
    if (error || !data) return [];
    return (data as unknown[]).map((v) =>
      typeof v === "string" ? v : String((v as Record<string, unknown>).productos_mas_vendidos ?? "")
    ).filter(Boolean);
  });
}

/** Pedido visto por el cliente (link con token). */
export function getPedidoPublico(token: string): Promise<PedidoPublico | null> {
  return safe(null, async () => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
    const supabase = await createClient();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("ver_pedido", { p_token: token });
    if (error || !data) return null;
    return data as PedidoPublico;
  });
}

// ---------- panel ----------

export function getOrders(opts?: { estado?: string }): Promise<Order[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    let query = supabase
      .from("orders")
      .select(
        "*, order_items ( id, producto, sku, color, medida, cantidad, precio_unitario )"
      )
      .order("created_at", { ascending: false });
    if (opts?.estado) query = query.eq("estado", opts.estado);
    const { data } = await query;
    return (data as unknown as Order[]) ?? [];
  });
}

export function getPendingOrdersCount(): Promise<number> {
  return safe(0, async () => {
    const supabase = await createClient();
    if (!supabase) return 0;
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("estado", ["pendiente_pago", "pagado"]);
    return count ?? 0;
  });
}

export function getArrepentimientos(): Promise<Arrepentimiento[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("arrepentimientos")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as Arrepentimiento[]) ?? [];
  });
}

export function getNewsletter(): Promise<{ email: string; created_at: string }[]> {
  return safe([], async () => {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("newsletter")
      .select("email, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });
}
