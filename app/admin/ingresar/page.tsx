import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Ingresar al panel — ${SITE.nombre}`,
  robots: { index: false },
  manifest: "/admin-manifest.webmanifest",
};

export default function AdminIngresarPage() {
  return (
    <div className="form-page">
      <h1>Panel {SITE.nombre}</h1>
      <p className="form-intro">Acceso exclusivo para administración.</p>
      <LoginForm next="/admin" />
    </div>
  );
}
