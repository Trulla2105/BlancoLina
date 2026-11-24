"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";
import { SITE } from "@/lib/site";

interface MenuItem {
  nombre: string;
  slug: string;
}

/** Menú lateral (hamburguesa): categorías, líneas y ayuda. */
export function MenuDrawer({
  categories,
  lineas,
}: {
  categories: MenuItem[];
  lineas: MenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // Se cierra solo al navegar.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <MenuIcon size={22} />
      </button>

      {open && (
        <div className="drawer-backdrop" onClick={close}>
          <aside
            className="drawer drawer-left"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <span className="drawer-title">{SITE.nombre}</span>
              <button type="button" className="icon-button" aria-label="Cerrar menú" onClick={close}>
                <CloseIcon size={20} />
              </button>
            </div>
            <nav className="drawer-nav">
              <Link href="/productos" onClick={close} className="drawer-strong">
                Ver todo
              </Link>
              {categories.map((c) => (
                <Link key={c.slug} href={`/productos?categoria=${c.slug}`} onClick={close}>
                  {c.nombre}
                </Link>
              ))}
              {lineas.length > 0 && <span className="drawer-heading">Líneas</span>}
              {lineas.map((l) => (
                <Link key={l.slug} href={`/productos?linea=${l.slug}`} onClick={close}>
                  {l.nombre}
                </Link>
              ))}
              <span className="drawer-heading">Ayuda</span>
              <Link href="/ayuda" onClick={close}>
                Cómo comprar
              </Link>
              <Link href="/ayuda#envios" onClick={close}>
                Envíos
              </Link>
              <Link href="/ayuda#cambios" onClick={close}>
                Cambios y devoluciones
              </Link>
              <Link href="/arrepentimiento" onClick={close}>
                Botón de arrepentimiento
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
