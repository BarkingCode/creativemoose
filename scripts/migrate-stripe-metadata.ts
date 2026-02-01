/**
 * Migration Script: Update Stripe Customer Metadata Structure
 *
 * Migrates existing customers from old credit structure to new structure:
 * OLD: { credits, total_gens }
 * NEW: { free_credits, image_credits, video_credits, total_gens }
 *
 * Usage:
 *   npx tsx scripts/migrate-stripe-metadata.ts
 *   Or: STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/migrate-stripe-metadata.ts
 *
 * Options:
 *   --dry-run    Preview changes without updating Stripe (default)
 *   --live       Confirm you want to run against live Stripe data
 */

import Stripe from "stripe";
import { config } from "dotenv";

// Load .env.local first, then .env
config({ path: ".env.local" });
config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required");
  console.error("   Make sure it's set in .env.local or pass it as: STRIPE_SECRET_KEY=sk_xxx npx tsx ...");
  process.exit(1);
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

async function migrateCustomerMetadata(dryRun: boolean = false) {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  let hasMore = true;
  let startingAfter: string | undefined;

  console.log("\n" + "=".repeat(60));
  console.log("  Stripe Customer Metadata Migration");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN (preview only)" : "LIVE UPDATE"}`);
  console.log(`Environment: ${STRIPE_SECRET_KEY.startsWith("sk_live") ? "PRODUCTION" : "TEST"}`);
  console.log("=".repeat(60) + "\n");

  if (!dryRun) {
    console.log("⚠️  WARNING: This will update customer metadata in Stripe!");
    console.log("   Press Ctrl+C to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log("Starting migration...\n");

  while (hasMore) {
    try {
      const customers = await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

      for (const customer of customers.data) {
        stats.total++;

        try {
          // Check if customer needs migration
          const hasOldFormat = customer.metadata.credits !== undefined;
          const hasNewFormat = customer.metadata.free_credits !== undefined;

          if (!hasOldFormat && !hasNewFormat) {
            // No metadata at all - skip
            stats.skipped++;
            console.log(`⊘ Skipped ${customer.id} (${customer.email || "no email"}) - no metadata`);
            continue;
          }

          if (hasNewFormat) {
            // Already migrated
            stats.skipped++;
            console.log(`⊘ Skipped ${customer.id} (${customer.email || "no email"}) - already migrated`);
            continue;
          }

          // Needs migration
          const oldCredits = parseInt(customer.metadata.credits || "0");
          const totalGens = customer.metadata.total_gens || "0";

          const newMetadata: Record<string, string> = {
            free_credits: "0", // Existing users don't get retroactive free credits
            image_credits: oldCredits.toString(),
            video_credits: "0",
            total_gens: totalGens,
            // Preserve other metadata fields
            ...(customer.metadata.last_gen_at && { last_gen_at: customer.metadata.last_gen_at }),
            ...(customer.metadata.last_preset && { last_preset: customer.metadata.last_preset }),
            ...(customer.metadata.last_event_id && { last_event_id: customer.metadata.last_event_id }),
            ...(customer.metadata.last_bytes && { last_bytes: customer.metadata.last_bytes }),
            ...(customer.metadata.last_hash && { last_hash: customer.metadata.last_hash }),
            // Remove old 'credits' field by setting it to empty string
            credits: "",
          };

          if (dryRun) {
            console.log(`[DRY RUN] Would migrate ${customer.id} (${customer.email || "no email"})`);
            console.log(`  Old: credits=${oldCredits}, total_gens=${totalGens}`);
            console.log(`  New: free_credits=0, image_credits=${oldCredits}, video_credits=0`);
          } else {
            await stripe.customers.update(customer.id, {
              metadata: newMetadata,
            });
            console.log(`✓ Migrated ${customer.id} (${customer.email || "no email"})`);
            console.log(`  credits: ${oldCredits} → image_credits: ${oldCredits}`);
          }

          stats.migrated++;
        } catch (error) {
          stats.errors++;
          console.error(`✗ Error migrating ${customer.id}:`, error instanceof Error ? error.message : error);
        }
      }

      hasMore = customers.has_more;
      if (hasMore && customers.data.length > 0) {
        startingAfter = customers.data[customers.data.length - 1].id;
        console.log(`\nFetching next batch (processed ${stats.total} customers)...\n`);
      }
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      break;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("  Migration Complete");
  console.log("=".repeat(60));
  console.log(`Total customers:     ${stats.total}`);
  console.log(`Migrated:            ${stats.migrated}`);
  console.log(`Skipped:             ${stats.skipped}`);
  console.log(`Errors:              ${stats.errors}`);
  console.log("=".repeat(60) + "\n");

  if (dryRun) {
    console.log("💡 This was a DRY RUN. No changes were made to Stripe.");
    console.log("   To perform the actual migration, run:");
    console.log("   STRIPE_SECRET_KEY=your_key npx tsx scripts/migrate-stripe-metadata.ts --live\n");
  } else {
    console.log("✅ Migration completed successfully!\n");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes("--live");

if (!isDryRun && !args.includes("--live")) {
  console.log("⚠️  Please specify --live to run the migration, or run without flags for a dry run.\n");
  process.exit(1);
}

// Run migration
migrateCustomerMetadata(isDryRun).catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
