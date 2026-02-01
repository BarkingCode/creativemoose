/**
 * Migration Script: Add Video Free Credits to Existing Users
 *
 * Adds 2 video free credits to all existing Stripe customers who don't have them yet.
 * This is for users created before the video credit feature was implemented.
 *
 * Usage:
 *   npx tsx scripts/add-video-free-credits.ts
 *   Or: STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/add-video-free-credits.ts
 *
 * Options:
 *   --dry-run    Preview changes without updating Stripe (default)
 *   --live       Confirm you want to run against Stripe data
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
  updated: number;
  skipped: number;
  errors: number;
}

async function addVideoFreeCredits(dryRun: boolean = true) {
  const stats: MigrationStats = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  let hasMore = true;
  let startingAfter: string | undefined;

  console.log("\n" + "=".repeat(60));
  console.log("  Add Video Free Credits to Existing Users");
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
          // Check if customer has metadata
          if (!customer.metadata || Object.keys(customer.metadata).length === 0) {
            stats.skipped++;
            console.log(`⊘ Skipped ${customer.id} (${customer.email || "no email"}) - no metadata`);
            continue;
          }

          // Check if customer already has video_free_credits
          const currentVideoFreeCredits = customer.metadata.video_free_credits;

          if (currentVideoFreeCredits !== undefined && currentVideoFreeCredits !== "" && currentVideoFreeCredits !== "0") {
            stats.skipped++;
            console.log(`⊘ Skipped ${customer.id} (${customer.email || "no email"}) - already has video_free_credits: ${currentVideoFreeCredits}`);
            continue;
          }

          // Check if this is an actual user (has some generation history or credits)
          const hasImageCredits = customer.metadata.image_credits !== undefined && customer.metadata.image_credits !== "";
          const hasFreeCredits = customer.metadata.free_credits !== undefined && customer.metadata.free_credits !== "";
          const hasTotalGens = customer.metadata.total_gens !== undefined && customer.metadata.total_gens !== "" && customer.metadata.total_gens !== "0";

          if (!hasImageCredits && !hasFreeCredits && !hasTotalGens) {
            stats.skipped++;
            console.log(`⊘ Skipped ${customer.id} (${customer.email || "no email"}) - no credit history`);
            continue;
          }

          // Add video free credits
          const newMetadata: Record<string, string> = {
            ...customer.metadata,
            video_free_credits: "2",
            total_video_gens: customer.metadata.total_video_gens || "0",
            video_credits: customer.metadata.video_credits || "0",
          };

          if (dryRun) {
            console.log(`[DRY RUN] Would update ${customer.id} (${customer.email || "no email"})`);
            console.log(`  Adding: video_free_credits=2`);
            console.log(`  Current metadata: ${JSON.stringify({
              free_credits: customer.metadata.free_credits,
              image_credits: customer.metadata.image_credits,
              total_gens: customer.metadata.total_gens,
            })}`);
          } else {
            await stripe.customers.update(customer.id, {
              metadata: newMetadata,
            });
            console.log(`✓ Updated ${customer.id} (${customer.email || "no email"})`);
            console.log(`  Added: video_free_credits=2`);
          }

          stats.updated++;
        } catch (error) {
          stats.errors++;
          console.error(`✗ Error updating ${customer.id}:`, error instanceof Error ? error.message : error);
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
  console.log(`Updated:             ${stats.updated}`);
  console.log(`Skipped:             ${stats.skipped}`);
  console.log(`Errors:              ${stats.errors}`);
  console.log("=".repeat(60) + "\n");

  if (dryRun) {
    console.log("💡 This was a DRY RUN. No changes were made to Stripe.");
    console.log("   To perform the actual migration, run:");
    console.log("   STRIPE_SECRET_KEY=your_key npx tsx scripts/add-video-free-credits.ts --live\n");
  } else {
    console.log("✅ Migration completed successfully!\n");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes("--live");

// Run migration
addVideoFreeCredits(isDryRun).catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
