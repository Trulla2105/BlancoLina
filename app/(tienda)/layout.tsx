import { CartDrawer } from "@/components/cart/CartDrawer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CartProvider } from "@/lib/cart/CartContext";
import { getConfigComercial, getConfigContacto } from "@/lib/queries";

// Stock y precios cambian desde el panel: la tienda se renderiza por pedido.
export const dynamic = "force-dynamic";

export default async function TiendaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [cfg, contacto] = await Promise.all([getConfigComercial(), getConfigContacto()]);
  return (
    <CartProvider>
      <AnnouncementBar cfg={cfg} />
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
      <CartDrawer cfg={cfg} />
      <WhatsAppButton numero={contacto.whatsapp} />
    </CartProvider>
  );
}
