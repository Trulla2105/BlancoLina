import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Cliente con la service role key: saltea RLS. Se usa SOLO del lado del
 * servidor para registrar los pagos que confirma Mercado Pago (webhook).
 * Devuelve null si falta SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!env || !serviceKey) return null;
  return createSupabaseClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
