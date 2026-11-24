import Link from "next/link";
import { CartIconLink } from "@/components/cart/CartLink";
import { getCategories, getLineas } from "@/lib/queries";
import { Logo } from "./Logo";
import { MenuDrawer } from "./MenuDrawer";
import { SearchBox } from "./SearchBox";

export async function Header() {
  const [categories, lineas] = await Promise.all([getCategories(), getLineas()]);
  const cats = categories.map((c) => ({ nombre: c.nombre, slug: c.slug }));
  const lins = lineas.map((l) => ({ nombre: l.nombre, slug: l.slug }));

  return (
    <header className="site-header">
      <div className="header-bar">
        <div className="header-left">
          <MenuDrawer categories={cats} lineas={lins} />
          <SearchBox className="searchbox searchbox-desktop" />
        </div>
        <Logo />
        <div className="header-right">
          <Link href="/ayuda" className="header-link">
            Ayuda
          </Link>
          <CartIconLink />
        </div>
      </div>
      <SearchBox className="searchbox searchbox-mobile" />
      {cats.length > 0 && (
        <nav className="main-nav" aria-label="Categorías">
          <Link href="/productos">Ver todo</Link>
          {cats.map((c) => (
            <Link key={c.slug} href={`/productos?categoria=${c.slug}`}>
              {c.nombre}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
