import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, "..");

/** Zelfde volgorde als Next.js: latere bestanden overschrijven eerdere waarden. */
const ENV_FILES = [".env", ".env.local", ".env.development", ".env.development.local"];

export function loadProjectEnv(options = {}) {
  const root = options.root ?? projectRoot;
  const loaded = [];

  for (const filename of ENV_FILES) {
    const filePath = path.join(root, filename);
    if (!fs.existsSync(filePath)) continue;

    const result = dotenv.config({ path: filePath, override: true, quiet: true });
    if (result.error) {
      throw new Error(`Kon ${filename} niet laden: ${result.error.message}`);
    }
    loaded.push(filename);
  }

  return { root, loaded };
}

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Ontbrekende environment variable: ${name}`);
  }
  return value;
}
