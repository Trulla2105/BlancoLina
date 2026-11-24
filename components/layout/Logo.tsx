import Link from "next/link";
import { SITE } from "@/lib/site";

/** Logo tipográfico: HOGAR LINA + bajada chica. */
export function Logo({ className = "logo" }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label={`${SITE.nombre} — inicio`}>
      <span className="logo-name">{SITE.nombre}</span>
      <span className="logo-sub">Blanquería</span>
    </Link>
  );
}
