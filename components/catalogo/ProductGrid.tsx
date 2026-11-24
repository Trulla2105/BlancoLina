import type { ConfigComercial, Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products, cfg }: { products: Product[]; cfg: ConfigComercial }) {
  if (products.length === 0) {
    return <div className="empty-note">No encontramos productos con esos filtros.</div>;
  }
  return (
    <div className="grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} cfg={cfg} />
      ))}
    </div>
  );
}
