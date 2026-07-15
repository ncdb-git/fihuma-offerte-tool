import "server-only";

import { supabaseClient } from "@/lib/supabase-proposals";
import type { UserRole } from "@/lib/auth-session";

export type DbUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

const USER_COLUMNS = "id, name, email, role, password_hash, created_at, updated_at";

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const client = supabaseClient();
  if (!client) return null;

  const normalized = email.trim().toLowerCase();
  const { data, error } = await client.from("users").select(USER_COLUMNS).ilike("email", normalized).maybeSingle();
  if (error) throw error;
  return (data as DbUser | null) ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const client = supabaseClient();
  if (!client) return null;

  const { data, error } = await client.from("users").select(USER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as DbUser | null) ?? null;
}

export async function upsertSeedUser(input: {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
}) {
  const client = supabaseClient();
  if (!client) throw new Error("Supabase niet geconfigureerd — kan gebruikers niet seeden.");

  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await client
      .from("users")
      .update({
        name: input.name,
        role: input.role,
        password_hash: input.passwordHash,
        updated_at: now
      })
      .eq("id", existing.id)
      .select(USER_COLUMNS)
      .single();
    if (error) throw error;
    return data as DbUser;
  }

  const { data, error } = await client
    .from("users")
    .insert({
      name: input.name,
      email,
      role: input.role,
      password_hash: input.passwordHash,
      created_at: now,
      updated_at: now
    })
    .select(USER_COLUMNS)
    .single();
  if (error) throw error;
  return data as DbUser;
}
