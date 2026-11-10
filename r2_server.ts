import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "node:path";
import { randomUUID } from "node:crypto";

const BUCKET = process.env.R2_BUCKET!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function createUploadUrl(fileName: string, contentType: string, keyPrefix = "uploads/") {
  const ext = path.extname(fileName).toLowerCase() || ".bin";
  const key = `${keyPrefix}${randomUUID()}${ext}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 } // ссылка живёт 5 минут
  );

  return { key, uploadUrl, url: await getFileUrl(key) };
}

export async function getFileUrl(key: string) {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

export async function deleteFromCloud(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  return { key, deleted: true };
}
