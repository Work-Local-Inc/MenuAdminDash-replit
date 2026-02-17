import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { uploadToR2 } from "@/lib/r2";
import { AuthError } from "@/lib/errors";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED_BUCKETS = [
  "restaurant-logos",
  "restaurant-images",
  "dish-images",
];

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError: any) {
      return NextResponse.json(
        { error: `Failed to parse form data: ${formError.message}` },
        { status: 400 },
      );
    }

    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as string;
    const path = formData.get("path") as string;

    if (!file || !bucket || !path) {
      return NextResponse.json(
        { error: "Missing required fields: file, bucket, or path" },
        { status: 400 },
      );
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json(
        {
          error: `Bucket '${bucket}' is not allowed. Allowed buckets: ${ALLOWED_BUCKETS.join(", ")}`,
        },
        { status: 403 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `File type '${file.type}' is not allowed. Allowed types: images only`,
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    if (!/^\d+\//.test(path)) {
      return NextResponse.json(
        { error: "Invalid path format. Path must start with restaurant ID" },
        { status: 400 },
      );
    }

    const pathParts = path.split("/");
    const filename = pathParts[pathParts.length - 1];
    const sanitizedFilename = sanitizeFilename(filename);
    pathParts[pathParts.length - 1] = sanitizedFilename;
    const sanitizedPath = pathParts.join("/");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await uploadToR2(bucket, sanitizedPath, buffer, file.type);

    return NextResponse.json({ url, path: sanitizedPath });
  } catch (error: any) {
    console.error("[Storage Upload] Error:", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 },
    );
  }
}
