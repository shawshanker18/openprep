import "server-only";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

let client: S3Client | undefined;
function config() {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET_NAME: bucket, R2_ENDPOINT: endpoint } = process.env;
  if (!account || !accessKeyId || !secretAccessKey || !bucket || !endpoint) throw new Error("Private storage is not configured");
  if (endpoint !== `https://${account}.r2.cloudflarestorage.com`) throw new Error("Invalid private storage endpoint");
  client ??= new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  return { client, bucket };
}
export function storageConfigured() {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"].every((name) => !!process.env[name]);
}
/** Server callers supply keys from trusted metadata, never from a browser parameter. */
export async function uploadObject(key: string, body: Buffer | Readable, contentType: string) {
  const { client, bucket } = config();
  // Automatically switches to multipart; bounded concurrency and abort on failure.
  return new Upload({ client, params: { Bucket: bucket, Key: key, Body: body, ContentType: contentType }, partSize: 8 * 1024 * 1024, queueSize: 2, leavePartsOnError: false }).done();
}
export async function readObject(key: string) {
  const { client, bucket } = config();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
export async function deleteObject(key: string) {
  const { client, bucket } = config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
/** Administrative/server use only. Do not expose bucket listing to students. */
export async function listObjects(prefix: string, continuationToken?: string) {
  const { client, bucket } = config();
  return client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken, MaxKeys: 100 }));
}
/** Optional server-only capability. The public API proxies files instead of returning these URLs. */
export async function presignObject(key: string, operation: "read" | "write", contentType?: string, seconds = 60) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300) throw new Error("Invalid expiry");
  const { client, bucket } = config();
  const command = operation === "read" ? new GetObjectCommand({ Bucket: bucket, Key: key }) : new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: seconds });
}
