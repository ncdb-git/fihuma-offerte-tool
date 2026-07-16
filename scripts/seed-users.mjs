#!/usr/bin/env node
/**
 * Seed gebruikersaccounts met random wachtwoorden.
 *
 * Gebruik:
 *   pnpm seed:users
 *
 * Laadt automatisch .env / .env.local uit de projectroot (zelfde als Next.js).
 * Vereist: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Output: supabase/seed-users.credentials.txt (eenmalig, niet committen)
 */

import { randomBytes, scrypt } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv, projectRoot, requireEnv } from "./load-env.mjs";

const scryptAsync = promisify(scrypt);
const credentialsPath = path.join(projectRoot, "supabase/seed-users.credentials.txt");

const SEED_USERS = [
  { name: "Nick de Bruijn", email: "info@fihumacollectief.nl", role: "admin" },
  { name: "Jeffrey de Groot", email: "jeffrey@fihumacollectief.nl", role: "admin" },
  { name: "Jesse Wilhelm", email: "jesse@fihumacollectief.nl", role: "advisor" },
  { name: "Doron Zohar", email: "doron@fihumacollectief.nl", role: "advisor" },
  { name: "Job in 't Veld", email: "job@fihumacollectief.nl", role: "advisor" },
  { name: "Dylan Batenburg", email: "dylan@fihumacollectief.nl", role: "advisor" },
  { name: "Dick de Groot", email: "dick@fihumacollectief.nl", role: "advisor" },
  { name: "Oktay Kayan", email: "oktay@fihumacollectief.nl", role: "advisor" },
  { name: "Kay den Haan", email: "kay@fihumacollectief.nl", role: "advisor" }
];

function generateSecurePassword(length = 18) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = randomBytes(length);
  let password = "";
  for (let index = 0; index < length; index += 1) {
    password += alphabet[bytes[index] % alphabet.length];
  }
  return password;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function main() {
  const { loaded } = loadProjectEnv();
  console.log(`Environment geladen vanuit: ${loaded.length ? loaded.join(", ") : "(geen .env-bestanden gevonden)"}`);

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const generated = [];

  for (const user of SEED_USERS) {
    const password = generateSecurePassword(18);
    const passwordHash = await hashPassword(password);
    const email = user.email.toLowerCase();
    const now = new Date().toISOString();

    const { data: existing, error: lookupError } = await client
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing?.id) {
      const { error } = await client
        .from("users")
        .update({ name: user.name, role: user.role, password_hash: passwordHash, updated_at: now })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await client.from("users").insert({
        name: user.name,
        email,
        role: user.role,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now
      });
      if (error) throw error;
    }

    generated.push({ name: user.name, email, role: user.role, password });
  }

  const lines = [
    "Fihuma offertetool — eenmalige seed-wachtwoorden",
    `Gegenereerd: ${new Date().toISOString()}`,
    "",
    "Bewaar dit bestand veilig en verwijder het na distributie aan gebruikers.",
    "Wachtwoorden staan niet plain text in de database.",
    "",
    ...generated.map((entry) => `${entry.name} (${entry.role})\n  E-mail: ${entry.email}\n  Wachtwoord: ${entry.password}\n`)
  ];

  await fs.writeFile(credentialsPath, `${lines.join("\n")}\n`, "utf8");

  console.log("Seed voltooid.");
  console.log(`Credentials geschreven naar: ${credentialsPath}`);
  console.log("");
  for (const entry of generated) {
    console.log(`${entry.name} <${entry.email}>  →  ${entry.password}`);
  }
}

main().catch((error) => {
  console.error("Seed mislukt:", error instanceof Error ? error.message : error);
  process.exit(1);
});
