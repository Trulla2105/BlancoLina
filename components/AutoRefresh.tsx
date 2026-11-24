"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Repide los datos al servidor cuando cambia la ruta (incluye volver atrás,
 * que si no reusa una copia vieja de la pantalla) y cuando la pestaña o la
 * app instalada vuelven a primer plano.
 */
export function AutoRefresh({
  refreshOnNavigate = false,
}: {
  refreshOnNavigate?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (refreshOnNavigate) router.refresh();
  }, [pathname, refreshOnNavigate, router]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [router]);

  return null;
}
