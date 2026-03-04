import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Create an S3 client from credentials.
 * @param {{ accessKeyId: string, secretAccessKey: string, region: string, endpoint?: string }} creds
 * @returns {S3Client | null}
 */
export function createS3Client(creds) {
  if (!creds?.accessKeyId || !creds?.secretAccessKey) return null;
  const config = {
    region: creds.region || 'ap-northeast-2',
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  };
  if (creds.endpoint) {
    config.endpoint = creds.endpoint;
    config.forcePathStyle = true;
  }
  return new S3Client(config);
}

/**
 * List objects (v2) and return Contents array.
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} prefix
 * @returns {Promise<{ Key: string, LastModified?: Date, Size?: number }[]>}
 */
export async function listObjectsV2(client, bucket, prefix = '') {
  const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
  const data = await client.send(command);
  return (data.Contents || []).filter((item) => !!item.Key);
}

/**
 * Get object body as Uint8Array and metadata.
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @returns {Promise<{ body: Uint8Array, ContentLength?: number, ContentType?: string }>}
 */
export async function getObjectBody(client, bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  const body = await response.Body.transformToByteArray();
  return {
    body,
    ContentLength: response.ContentLength,
    ContentType: response.ContentType,
  };
}

/**
 * Put object.
 * Response Cache-Control is set to max-age=30 so GET responses are cached at most 30 seconds.
 * @param {S3Client} client
 * @param {{ Bucket: string, Key: string, Body: string | Uint8Array, ContentType?: string, CacheControl?: string }} params
 */
export async function putObject(client, params) {
  const withCache = { ...params, CacheControl: params.CacheControl ?? 'max-age=30' };
  await client.send(new PutObjectCommand(withCache));
}

/**
 * Delete a single object.
 */
export async function deleteObject(client, bucket, key) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Delete multiple objects.
 * @param {S3Client} client
 * @param {string} bucket
 * @param {{ Key: string }[]} objects
 */
export async function deleteObjects(client, bucket, objects) {
  if (objects.length === 0) return;
  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: objects, Quiet: false },
    })
  );
}

/**
 * Copy object within the same bucket.
 * Sets CacheControl to max-age=30 on the copy.
 */
export async function copyObject(client, bucket, copySourceKey, key) {
  const copySource = `${bucket}/${encodeURIComponent(copySourceKey)}`;
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: copySource,
      Key: key,
      CacheControl: 'max-age=30',
    })
  );
}

/**
 * Generate a presigned GET URL for an object.
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @param {number} expiresIn seconds
 * @returns {Promise<string>}
 */
export async function getSignedGetUrl(client, bucket, key, expiresIn = 60) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}
