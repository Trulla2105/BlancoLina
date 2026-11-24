import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AutoRefresh } from "@/components/AutoRefresh";
import { salir } from "@/lib/actions/auth";
import { getPendingOrdersCount, getViewer } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Panel — ${SITE.nombre}`,
  robots: { index: false },
  // Manifest propio: instalado desde acá, el ícono del celular abre /admin
  manifest: "/admin-manifest.webmanifest",
};

// El panel muestra datos según la sesión de admin: siempre por pedido.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/admin/ingresar");

  if (!viewer.isAdmin) {
    return (
      <div className="form-page">
        <h1>Sin permisos</h1>
        <div className="status-box rechazado">
          <span className="status-label">Acceso denegado</span>
          <p>Tu usuario ({viewer.email}) no tiene rol de administrador.</p>
        </div>
        <form action={salir} style={{ textAlign: "center", marginTop: 28 }}>
          <button type="submit" className="btn">
            Cerrar sesión
          </button>
        </form>
      </div>
    );
  }

  const pendientes = await getPendingOrdersCount();

  return (
    <div className="admin-shell">
      <AutoRefresh refreshOnNavigate />
      <aside className="admin-aside">
        <Link href="/" className="admin-logo">
          {SITE.nombre}
        </Link>
        <div className="admin-tag">Panel de administración</div>
        <nav>
          <Link href="/admin">Resumen</Link>
          <Link href="/admin/pedidos" className="nav-with-badge">
            Pedidos
            {pendientes > 0 && <span className="nav-badge">{pendientes}</span>}
          </Link>
          <Link href="/admin/productos">Productos</Link>
          <Link href="/admin/categorias">Categorías y líneas</Link>
          <Link href="/admin/banners">Banners</Link>
          <Link href="/admin/configuracion">Configuración</Link>
          <Link href="/admin/instagram">Instagram</Link>
          <Link href="/admin/arrepentimientos">Arrepentimientos</Link>
          <Link href="/admin/newsletter">Newsletter</Link>
        </nav>
        <div className="aside-bottom">
          <nav>
            <Link href="/">Ver la tienda</Link>
          </nav>
          <form action={salir} style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-sm">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
