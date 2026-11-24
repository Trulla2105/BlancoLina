import Link from "next/link";
import { Benefits } from "@/components/catalogo/Benefits";
import { CategoryTiles } from "@/components/catalogo/CategoryTiles";
import { HelpSection } from "@/components/catalogo/HelpSection";
import { HeroCarousel } from "@/components/catalogo/HeroCarousel";
import { InstagramCarousel } from "@/components/catalogo/InstagramCarousel";
import { InstagramEmbed } from "@/components/catalogo/InstagramEmbed";
import { LineasBanners } from "@/components/catalogo/LineasBanners";
import { ProductCarousel } from "@/components/catalogo/ProductCarousel";
import { TabbedProducts } from "@/components/catalogo/TabbedProducts";
import {
  getCategories,
  getConfigComercial,
  getConfigContacto,
  getHeroBanners,
  getInstagramEmbed,
  getInstagramPosts,
  getLineas,
  getMasVendidosIds,
  getProducts,
} from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase/env";

export default async function HomePage() {
  const [cfg, contacto, banners, categories, lineas, todos, vendidosIds, igPosts, igEmbed] =
    await Promise.all([
      getConfigComercial(),
      getConfigContacto(),
      getHeroBanners(),
      getCategories(),
      getLineas(),
      getProducts(),
      getMasVendidosIds(12),
      getInstagramPosts(),
      getInstagramEmbed(),
    ]);

  // Más vendidos según pedidos cobrados; se completa con el orden manual del panel.
  const porId = new Map(todos.map((p) => [p.id, p]));
  const masVendidos = [
    ...vendidosIds.map((id) => porId.get(id)).filter((p) => p !== undefined),
    ...todos.filter((p) => !vendidosIds.includes(p.id)),
  ].slice(0, 12);

  const slides = banners
    .filter((b) => b.activo)
    .map((b) => ({
      id: b.id,
      src: publicImageUrl(b.url),
      srcMobile: b.url_mobile ? publicImageUrl(b.url_mobile) : null,
      titulo: b.titulo,
      subtitulo: b.subtitulo,
      boton: b.boton,
      link: b.link || "/productos",
    }));

  // Destacados = elegidos en el panel; si no hay, los primeros del orden manual.
  const destacados = todos.filter((p) => p.destacado);
  const imperdibles = destacados.length > 0 ? destacados : todos.slice(0, 8);
  const nuevos = [...todos].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);

  return (
    <>
      <HeroCarousel slides={slides} />

      <section className="section">
        <div className="section-head">
          <h2>Los más vendidos</h2>
          <Link href="/productos" className="see-all">
            Ver todo
          </Link>
        </div>
        <TabbedProducts products={masVendidos} cfg={cfg} />
      </section>

      {categories.some((c) => c.imagen) && (
        <section className="section">
          <div className="section-head">
            <h2>Comprá por categoría</h2>
          </div>
          <CategoryTiles categories={categories} />
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Los imperdibles para tu casa</h2>
        </div>
        <ProductCarousel products={imperdibles} cfg={cfg} />
      </section>

      <LineasBanners lineas={lineas} />

      <section className="section">
        <div className="section-head">
          <h2>Los más nuevos</h2>
        </div>
        <ProductCarousel products={nuevos} cfg={cfg} />
      </section>

      <Benefits cfg={cfg} />

      {igEmbed ? (
        <InstagramEmbed html={igEmbed} instagram={contacto.instagram} />
      ) : (
        <InstagramCarousel posts={igPosts} instagram={contacto.instagram} />
      )}

      <HelpSection contacto={contacto} />
    </>
  );
}
