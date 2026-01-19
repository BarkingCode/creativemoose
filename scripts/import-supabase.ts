/**
 * User Import Script - Import to Supabase
 *
 * Reads the migration JSON file and imports users into Supabase:
 * 1. Creates Supabase auth users (sends password reset emails)
 * 2. Creates profiles in the profiles table
 * 3. Creates credit records in the credits table
 *
 * Usage: npx tsx scripts/import-supabase.ts
 *
 * Required environment variables:
 * - SUPABASE_SERVICE_ROLE_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Types
interface MigrationUser {
  clerk_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  stripe_customer_id: string | null;
  credits: {
    image_credits: number;
    free_credits: number;
    total_generations: number;
    last_generation_at: string | null;
    last_preset: string | null;
  };
}

interface MigrationData {
  exported_at: string;
  total_users: number;
  users: MigrationUser[];
}

interface ImportResult {
  email: string;
  status: "created" | "exists" | "error";
  supabase_id?: string;
  error?: string;
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

async function importUsers(): Promise<void> {
  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is required");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  }

  // Read migration data
  const migrationPath = path.join(__dirname, "migration-data.json");
  if (!fs.existsSync(migrationPath)) {
    throw new Error(
      `Migration file not found at ${migrationPath}. Run migrate-users.ts first.`
    );
  }

  const migrationData: MigrationData = JSON.parse(
    fs.readFileSync(migrationPath, "utf-8")
  );

  console.log(`📂 Loaded migration data from ${migrationData.exported_at}`);
  console.log(`   Total users to import: ${migrationData.total_users}`);

  const results: ImportResult[] = [];
  let created = 0;
  let existing = 0;
  let errors = 0;

  // Process users in batches
  const batchSize = 10;
  for (let i = 0; i < migrationData.users.length; i += batchSize) {
    const batch = migrationData.users.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (user) => {
        try {
          // Check if user already exists
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users.find(
            (u) => u.email?.toLowerCase() === user.email.toLowerCase()
          );

          let supabaseUserId: string;

          if (existingUser) {
            console.log(`  ⏭️  User exists: ${user.email}`);
            supabaseUserId = existingUser.id;
            existing++;
            results.push({
              email: user.email,
              status: "exists",
              supabase_id: supabaseUserId,
            });
          } else {
            // Create new Supabase auth user
            const { data: newUser, error: createError } =
              await supabase.auth.admin.createUser({
                email: user.email,
                email_confirm: true, // Auto-confirm since they were verified in Clerk
                user_metadata: {
                  name: user.name,
                  avatar_url: user.avatar_url,
                  migrated_from_clerk: user.clerk_id,
                },
              });

            if (createError) {
              throw createError;
            }

            supabaseUserId = newUser.user.id;
            console.log(`  ✅ Created user: ${user.email}`);
            created++;
            results.push({
              email: user.email,
              status: "created",
              supabase_id: supabaseUserId,
            });

            // Send password reset email so user can set their password
            const { error: resetError } =
              await supabase.auth.admin.generateLink({
                type: "recovery",
                email: user.email,
              });

            if (resetError) {
              console.warn(`    ⚠️  Could not generate reset link: ${resetError.message}`);
            }
          }

          // Create or update profile
          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: supabaseUserId,
              email: user.email,
              name: user.name,
              avatar_url: user.avatar_url,
              created_at: user.created_at,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

          if (profileError) {
            console.warn(`    ⚠️  Profile error: ${profileError.message}`);
          }

          // Create or update credits
          const { error: creditsError } = await supabase.from("credits").upsert(
            {
              user_id: supabaseUserId,
              image_credits: user.credits.image_credits,
              free_credits: user.credits.free_credits,
              total_generations: user.credits.total_generations,
              last_generation_at: user.credits.last_generation_at,
              last_preset: user.credits.last_preset,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

          if (creditsError) {
            console.warn(`    ⚠️  Credits error: ${creditsError.message}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Error for ${user.email}: ${errorMessage}`);
          errors++;
          results.push({
            email: user.email,
            status: "error",
            error: errorMessage,
          });
        }
      })
    );

    // Progress update
    console.log(
      `\n📊 Progress: ${Math.min(i + batchSize, migrationData.users.length)}/${migrationData.total_users}`
    );
  }

  // Write results
  const resultsPath = path.join(__dirname, "import-results.json");
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        imported_at: new Date().toISOString(),
        summary: { created, existing, errors },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n✅ Import complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Already existed: ${existing}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Results saved to: ${resultsPath}`);

  if (created > 0) {
    console.log(`\n📧 Password reset emails:`);
    console.log(`   Users will receive password reset links to set their passwords.`);
    console.log(`   Alternatively, run the send-reset-emails.ts script separately.`);
  }
}

// Run import
importUsers().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
