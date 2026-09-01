import { prisma } from "./prisma";
import { createClient } from "./supabase/server";

export async function requireCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("AUTH_REQUIRED");
  return prisma.user.upsert({ where: { id: data.user.id }, update: { email: data.user.email ?? `${data.user.id}@supabase.local`, name: data.user.user_metadata?.name ?? undefined }, create: { id: data.user.id, email: data.user.email ?? `${data.user.id}@supabase.local`, name: data.user.user_metadata?.name ?? null, settings: { create: {} } }, include: { settings: true } });
}
