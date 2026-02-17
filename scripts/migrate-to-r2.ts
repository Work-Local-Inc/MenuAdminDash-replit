import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CDN_URL = "https://cdn.menuai.ca";
const CDN_SECRET = process.env.R2_UPLOAD_SECRET!;
const DB_URL = process.env.LOCAL_DB_URL || process.env.SUPABASE_BRANCH_DB_URL!;

const BUCKETS = [
  "restaurant-logos",
  "restaurant-images",
  "dish-images",
  "email-assets",
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listAllFiles(bucket: string): Promise<string[]> {
  const paths: string[] = [];

  async function listDir(prefix: string) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
    });
    if (error) {
      console.error(`Error listing ${bucket}/${prefix}:`, error.message);
      return;
    }
    for (const item of data || []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        // It's a file
        paths.push(fullPath);
      } else {
        // It's a folder
        await listDir(fullPath);
      }
    }
  }

  await listDir("");
  return paths;
}

async function downloadFile(
  bucket: string,
  path: string,
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) {
    console.error(`  Failed to download ${bucket}/${path}:`, error.message);
    return null;
  }
  const arrayBuffer = await data.arrayBuffer();
  const contentType = data.type || "application/octet-stream";
  return { data: arrayBuffer, contentType };
}

async function uploadToR2(
  key: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<boolean> {
  const response = await fetch(`${CDN_URL}/${key}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CDN_SECRET}`,
      "Content-Type": contentType,
    },
    body: data,
  });
  return response.ok;
}

async function migrateFiles() {
  console.log("=== Migrating Supabase Storage to Cloudflare R2 ===\n");

  let totalFiles = 0;
  let successFiles = 0;
  let failedFiles = 0;

  for (const bucket of BUCKETS) {
    console.log(`\n--- Bucket: ${bucket} ---`);
    const files = await listAllFiles(bucket);
    console.log(`  Found ${files.length} files`);

    for (const filePath of files) {
      totalFiles++;
      const r2Key = `${bucket}/${filePath}`;

      // Download from Supabase
      const file = await downloadFile(bucket, filePath);
      if (!file) {
        failedFiles++;
        continue;
      }

      // Upload to R2
      const ok = await uploadToR2(r2Key, file.data, file.contentType);
      if (ok) {
        successFiles++;
        console.log(
          `  OK: ${r2Key} (${(file.data.byteLength / 1024).toFixed(1)}KB)`,
        );
      } else {
        failedFiles++;
        console.error(`  FAIL: ${r2Key}`);
      }
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(
    `Total: ${totalFiles} | Success: ${successFiles} | Failed: ${failedFiles}`,
  );
}

async function updateDatabaseUrls() {
  console.log("\n=== Updating Database URLs ===\n");

  const pool = new Pool({ connectionString: DB_URL });
  const supabaseStorageBase = `${SUPABASE_URL}/storage/v1/object/public/`;

  // Update restaurant_images
  const { rowCount: imgRows } = await pool.query(
    `
    UPDATE restaurant_images
    SET image_url = REPLACE(image_url, $1, $2)
    WHERE image_url LIKE $3
  `,
    [supabaseStorageBase, CDN_URL + "/", supabaseStorageBase + "%"],
  );
  console.log(`  restaurant_images: ${imgRows} rows updated`);

  // Update restaurants.logo_url
  const { rowCount: logoRows } = await pool.query(
    `
    UPDATE restaurants
    SET logo_url = REPLACE(logo_url, $1, $2)
    WHERE logo_url LIKE $3
  `,
    [supabaseStorageBase, CDN_URL + "/", supabaseStorageBase + "%"],
  );
  console.log(`  restaurants.logo_url: ${logoRows} rows updated`);

  // Update restaurants.banner_image_url
  const { rowCount: bannerRows } = await pool.query(
    `
    UPDATE restaurants
    SET banner_image_url = REPLACE(banner_image_url, $1, $2)
    WHERE banner_image_url LIKE $3
  `,
    [supabaseStorageBase, CDN_URL + "/", supabaseStorageBase + "%"],
  );
  console.log(`  restaurants.banner_image_url: ${bannerRows} rows updated`);

  // Update dishes.image_url
  const { rowCount: dishRows } = await pool.query(
    `
    UPDATE dishes
    SET image_url = REPLACE(image_url, $1, $2)
    WHERE image_url LIKE $3
  `,
    [supabaseStorageBase, CDN_URL + "/", supabaseStorageBase + "%"],
  );
  console.log(`  dishes.image_url: ${dishRows} rows updated`);

  await pool.end();
  console.log("\n  Database URLs updated!");
}

async function main() {
  if (!CDN_SECRET) {
    console.error("Missing R2_UPLOAD_SECRET env var");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args.includes("--files-only")) {
    await migrateFiles();
  } else if (args.includes("--db-only")) {
    await updateDatabaseUrls();
  } else {
    await migrateFiles();
    await updateDatabaseUrls();
  }
}

main().catch(console.error);
