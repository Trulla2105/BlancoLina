"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

function texto(f: FormData, k: string, max = 200): string {
  return String(f.get(k) ?? "").trim().slice(0, max);
}

function numero(f: FormData, k: string): number | null {
  const raw = String(f.get(k) ?? "").replace(/[^\d]/g, "");
  return raw === "" ? null : Number(raw);
}

async function guardar(key: string, value: Record<string, unknown>): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  const { data, error } = await supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select("key");
  if (error) return { error: `No se pudo guardar: ${error.message}` };
  if (!data || data.length === 0) return { error: "No se guardó: revisá tu sesión de admin." };
  revalidatePath("/", "layout");
  return { ok: "Guardado." };
}

export async function guardarComercial(_prev: FormState, f: FormData): Promise<FormState> {
  const pct = numero(f, "transferencia_pct") ?? 0;
  const cuotas = numero(f, "cuotas") ?? 1;
  if (pct < 0 || pct > 90) return { error: "El descuento por transferencia tiene que estar entre 0 y 90%." };
  if (cuotas < 1 || cuotas > 24) return { error: "Las cuotas tienen que estar entre 1 y 24." };
  return guardar("comercial", {
    transferencia_pct: pct,
    cuotas,
    envio_gratis_desde: numero(f, "envio_gratis_desde"),
    costo_envio: numero(f, "costo_envio"),
    retiro_habilitado: f.get("retiro_habilitado") === "on",
    retiro_direccion: texto(f, "retiro_direccion"),
  });
}

export async function guardarContacto(_prev: FormState, f: FormData): Promise<FormState> {
  return guardar("contacto", {
    whatsapp: texto(f, "whatsapp", 40),
    email: texto(f, "email", 120),
    direccion: texto(f, "direccion"),
    instagram: texto(f, "instagram", 120),
    horario: texto(f, "horario"),
  });
}

export async function guardarTransferencia(_prev: FormState, f: FormData): Promise<FormState> {
  return guardar("transferencia", {
    titular: texto(f, "titular"),
    cuit: texto(f, "cuit", 20),
    banco: texto(f, "banco"),
    cbu: texto(f, "cbu", 30).replace(/\s/g, ""),
    alias: texto(f, "alias", 40),
  });
}

export async function marcarArrepentimiento(formData: FormData): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const id = String(formData.get("id") ?? "");
  const atendido = formData.get("atendido") === "true";
  const { error } = await supabase.from("arrepentimientos").update({ atendido }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/arrepentimientos");
  revalidatePath("/admin");
}
