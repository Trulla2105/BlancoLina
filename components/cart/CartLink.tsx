"use client";

import { CartIcon } from "@/components/ui/Icons";
import { useCart } from "@/lib/cart/CartContext";

/** Ícono de carrito con contador: abre el carrito lateral. */
export function CartIconLink() {
  const { totalUnidades, mounted, setDrawerOpen } = useCart();
  return (
    <button
      type="button"
      className="icon-button cart-icon-link"
      aria-label={`Carrito${mounted && totalUnidades > 0 ? ` (${totalUnidades})` : ""}`}
      onClick={() => setDrawerOpen(true)}
    >
      <CartIcon size={22} />
      {mounted && totalUnidades > 0 && <span className="cart-badge">{totalUnidades}</span>}
    </button>
  );
}
