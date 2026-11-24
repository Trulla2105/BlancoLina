import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { getConfigComercial } from "@/lib/queries";

export const metadata: Metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const cfg = await getConfigComercial();
  return (
    <div className="page">
      <h1 className="page-title">Carrito de compras</h1>
      <CartView cfg={cfg} />
    </div>
  );
}
