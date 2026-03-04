/**
 * IndexedDB에 저장된 업로드 실패 파일을 S3에 동기화
 * 서버 파일이 더 최신이면 .tmp.{ISOTime}.{suffix} 형태로 업로드
 */
import { putObject, headObject } from './s3Client';
import {
  getPendingUploads,
  deletePendingUpload,
  deletePendingUploadByKey,
} from './pendingUploadsDb';

/**
 * key에서 suffix(확장자) 추출
 * "notes/foo.md" -> "md"
 */
function getSuffix(key) {
  const lastDot = key.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return key.slice(lastDot + 1);
}

/**
 * key에서 .tmp.{ISOTime}.{suffix} 형태의 새 키 생성
 * "notes/foo.md" -> "notes/foo.tmp.2025-03-04T12-30-45.123Z.md"
 */
function getTmpKey(originalKey) {
  const suffix = getSuffix(originalKey);
  const baseWithoutExt = suffix ? originalKey.slice(0, -(suffix.length + 1)) : originalKey;
  const iso = new Date().toISOString().replace(/:/g, '-');
  return suffix ? `${baseWithoutExt}.tmp.${iso}.${suffix}` : `${baseWithoutExt}.tmp.${iso}`;
}

/**
 * 대기 중인 업로드를 S3에 동기화
 * @param {import('@aws-sdk/client-s3').S3Client} client
 * @param {string} bucket
 * @param {(msg: string) => void} [onStatus]
 * @returns {Promise<{ synced: number, failed: number }>}
 */
export async function syncPendingUploads(client, bucket, onStatus) {
  const pending = await getPendingUploads();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const serverMeta = await headObject(client, bucket, item.key);
      const ourModified = new Date(item.modifiedAt);
      let uploadKey = item.key;

      if (serverMeta?.LastModified) {
        const serverModified =
          serverMeta.LastModified instanceof Date
            ? serverMeta.LastModified
            : new Date(serverMeta.LastModified);
        if (serverModified.getTime() > ourModified.getTime()) {
          uploadKey = getTmpKey(item.key);
          onStatus?.(`충돌: ${item.key} → ${uploadKey}로 업로드`);
        }
      }

      await putObject(client, {
        Bucket: bucket,
        Key: uploadKey,
        Body: item.content,
        ContentType: item.contentType ?? 'text/plain',
      });

      await deletePendingUpload(item.id);
      synced++;
    } catch (e) {
      console.error('Pending upload sync failed:', item.key, e);
      failed++;
    }
  }

  return { synced, failed };
}
