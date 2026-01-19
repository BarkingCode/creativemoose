/**
 * User Migration Script - Export from Clerk and Stripe
 *
 * Exports all users from Clerk and their credit data from Stripe customer metadata.
 * Creates a JSON file that can be used to import users into Supabase.
 *
 * Usage: npx tsx scripts/migrate-users.ts
 *
 * Required environment variables:
 * - CLERK_SECRET_KEY
 * - STRIPE_SECRET_KEY
 */

import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

// Types
interface ClerkUser {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: { status: string } | null;
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  updated_at: number;
}

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

// Initialize clients
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

async function fetchClerkUsers(): Promise<ClerkUser[]> {
  const users: ClerkUser[] = [];
  let offset = 0;
  const limit = 100;

  console.log("Fetching users from Clerk...");

  while (true) {
    const response = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Clerk API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    users.push(...data);
    console.log(`  Fetched ${users.length} users so far...`);

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  console.log(`Total Clerk users: ${users.length}`);
  return users;
}

async function fetchStripeCustomers(): Promise<Map<string, Stripe.Customer>> {
  const customerMap = new Map<string, Stripe.Customer>();

  console.log("Fetching customers from Stripe...");

  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Stripe.CustomerListParams = { limit: 100 };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const customers = await stripe.customers.list(params);

    for (const customer of customers.data) {
      // Map by email for matching with Clerk users
      if (customer.email) {
        customerMap.set(customer.email.toLowerCase(), customer);
      }
    }

    console.log(`  Fetched ${customerMap.size} customers so far...`);

    hasMore = customers.has_more;
    if (customers.data.length > 0) {
      startingAfter = customers.data[customers.data.length - 1].id;
    }
  }

  console.log(`Total Stripe customers: ${customerMap.size}`);
  return customerMap;
}

function parseCreditsFromMetadata(customer: Stripe.Customer | null): MigrationUser["credits"] {
  const defaultCredits = {
    image_credits: 0,
    free_credits: 0,
    total_generations: 0,
    last_generation_at: null,
    last_preset: null,
  };

  if (!customer?.metadata) {
    return defaultCredits;
  }

  const metadata = customer.metadata;

  return {
    image_credits: parseInt(metadata.image_credits || metadata.credits || "0", 10) || 0,
    free_credits: parseInt(metadata.free_credits || "0", 10) || 0,
    total_generations: parseInt(metadata.total_gens || metadata.total_generations || "0", 10) || 0,
    last_generation_at: metadata.last_gen_at || metadata.last_generation_at || null,
    last_preset: metadata.last_preset || null,
  };
}

async function exportUsers(): Promise<void> {
  // Validate environment
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY environment variable is required");
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }

  // Fetch data from both services
  const [clerkUsers, stripeCustomers] = await Promise.all([
    fetchClerkUsers(),
    fetchStripeCustomers(),
  ]);

  // Combine user data
  console.log("\nCombining user data...");
  const migrationUsers: MigrationUser[] = [];

  for (const clerkUser of clerkUsers) {
    const primaryEmail = clerkUser.email_addresses.find(
      (e) => e.verification?.status === "verified"
    )?.email_address || clerkUser.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      console.warn(`  Skipping user ${clerkUser.id}: No email address`);
      continue;
    }

    const stripeCustomer = stripeCustomers.get(primaryEmail.toLowerCase()) || null;
    const credits = parseCreditsFromMetadata(stripeCustomer);

    const name = [clerkUser.first_name, clerkUser.last_name]
      .filter(Boolean)
      .join(" ") || null;

    migrationUsers.push({
      clerk_id: clerkUser.id,
      email: primaryEmail,
      name,
      avatar_url: clerkUser.image_url,
      created_at: new Date(clerkUser.created_at).toISOString(),
      stripe_customer_id: stripeCustomer?.id || null,
      credits,
    });
  }

  // Create migration data
  const migrationData: MigrationData = {
    exported_at: new Date().toISOString(),
    total_users: migrationUsers.length,
    users: migrationUsers,
  };

  // Write to file
  const outputPath = path.join(__dirname, "migration-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(migrationData, null, 2));

  console.log(`\n✅ Export complete!`);
  console.log(`   Total users exported: ${migrationUsers.length}`);
  console.log(`   Output file: ${outputPath}`);

  // Summary statistics
  const usersWithCredits = migrationUsers.filter(
    (u) => u.credits.image_credits > 0 || u.credits.free_credits > 0
  );
  const totalCredits = migrationUsers.reduce(
    (sum, u) => sum + u.credits.image_credits + u.credits.free_credits,
    0
  );
  const totalGenerations = migrationUsers.reduce(
    (sum, u) => sum + u.credits.total_generations,
    0
  );

  console.log(`\n📊 Statistics:`);
  console.log(`   Users with credits: ${usersWithCredits.length}`);
  console.log(`   Total credits to migrate: ${totalCredits}`);
  console.log(`   Total historical generations: ${totalGenerations}`);
}

// Run export
exportUsers().catch((error) => {
  console.error("Export failed:", error);
  process.exit(1);
});
