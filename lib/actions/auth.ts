"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function ingresar(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado todavía." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) return { error: "Completá email y contraseña." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Email o contraseña incorrectos." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Tenés que confirmar tu email antes de ingresar." };
    }
    return { error: error.message };
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
}

export async function salir(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
