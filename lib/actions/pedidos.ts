"use server";

import { revalidatePath } from "next/cache";
import { notificarEstadoPedido } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

/** Cambia el estado de un pedido (cancelar devuelve el stock: trigger en la base). */
export async function cambiarEstadoPedido(formData: FormData): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as OrderStatus;
  if (!id || !ORDER_STATUSES.includes(estado)) throw new Error("Estado de pedido inválido.");

  const { data: antes } = await supabase.from("orders").select("estado").eq("id", id).maybeSingle();
  if (!antes) throw new Error("El pedido no existe o tu sesión no tiene permisos de admin.");
  if (antes.estado === estado) return;

  const { data: order, error } = await supabase
    .from("orders")
    .update({ estado, ...(estado === "pagado" ? { pagado_at: new Date().toISOString() } : {}) })
    .eq("id", id)
    .select("numero, token, email, nombre, estado")
    .single();
  if (error) throw new Error(`No se pudo actualizar el pedido: ${error.message}`);

  await notificarEstadoPedido({
    email: order.email,
    nombre: order.nombre,
    numero: order.numero,
    token: order.token,
    estado: order.estado as OrderStatus,
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
}
