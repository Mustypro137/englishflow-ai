// Fails early with a clear message when required environment variables are missing.
// Usage: node scripts/check-env.mjs NAME [NAME...]
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const missing = process.argv.slice(2).filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(
    `\nMissing environment variable(s): ${missing.join(", ")}\n` +
      "Locally: add them to .env.local (see .env.example).\n" +
      "On Vercel: Project → Settings → Environment Variables. Check the exact names, make sure\n" +
      "\"Production\" is ticked, save, then redeploy.\n",
  );
  process.exit(1);
}
console.log(`Environment OK: ${process.argv.slice(2).join(", ")}`);
