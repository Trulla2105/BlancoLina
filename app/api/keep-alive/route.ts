import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Ping diario (Vercel Cron → ver vercel.json) para que el proyecto de Supabase
 * no se pause por inactividad en el plan Free. Hace una consulta mínima que
 * cuenta como actividad y reinicia el contador de los 7 días. No expone datos.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "supabase-sin-configurar" });
  }

  // Consulta trivial: alcanza para que Supabase registre actividad.
  const { error } = await supabase.from("categories").select("id").limit(1);

  return NextResponse.json({
    ok: !error,
    at: new Date().toISOString(),
    ...(error ? { error: error.message } : {}),
  });
}
