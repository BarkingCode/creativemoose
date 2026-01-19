/**
 * Send Password Reset Emails Script
 *
 * Sends password reset emails to all migrated users so they can
 * set their Supabase passwords. Run this after import-supabase.ts.
 *
 * Usage: npx tsx scripts/send-reset-emails.ts
 *
 * Required environment variables:
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

interface ImportResult {
  email: string;
  status: "created" | "exists" | "error";
  supabase_id?: string;
  error?: string;
}

interface ImportResults {
  imported_at: string;
  summary: { created: number; existing: number; errors: number };
  results: ImportResult[];
}

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function sendResetEmails(): Promise<void> {
  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is required");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  }

  // Read import results
  const resultsPath = path.join(__dirname, "import-results.json");
  if (!fs.existsSync(resultsPath)) {
    throw new Error(
      `Import results file not found at ${resultsPath}. Run import-supabase.ts first.`
    );
  }

  const importResults: ImportResults = JSON.parse(
    fs.readFileSync(resultsPath, "utf-8")
  );

  // Filter to only newly created users
  const newUsers = importResults.results.filter((r) => r.status === "created");

  if (newUsers.length === 0) {
    console.log("No newly created users found. Nothing to do.");
    return;
  }

  console.log(`📧 Sending password reset emails to ${newUsers.length} users...`);

  let sent = 0;
  let failed = 0;

  // Process in batches to avoid rate limiting
  const batchSize = 5;
  const delayMs = 1000; // 1 second between batches

  for (let i = 0; i < newUsers.length; i += batchSize) {
    const batch = newUsers.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (user) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(
            user.email,
            {
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback?type=recovery`,
            }
          );

          if (error) {
            console.error(`  ❌ Failed for ${user.email}: ${error.message}`);
            failed++;
          } else {
            console.log(`  ✅ Sent to ${user.email}`);
            sent++;
          }
        } catch (error) {
          console.error(
            `  ❌ Error for ${user.email}: ${error instanceof Error ? error.message : String(error)}`
          );
          failed++;
        }
      })
    );

    // Progress update and delay
    console.log(`  Progress: ${Math.min(i + batchSize, newUsers.length)}/${newUsers.length}`);

    if (i + batchSize < newUsers.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Sent: ${sent}`);
  console.log(`   Failed: ${failed}`);
}

// Run
sendResetEmails().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
