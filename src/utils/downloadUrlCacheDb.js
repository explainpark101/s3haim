/**
 * 다운로드용 presigned URL 캐시 (IndexedDB)
 * 만료 시각까지 유효한 URL을 저장하여 재사용
 */
import Dexie from 'dexie';

export const downloadUrlCacheDb = new Dexie('s3haim-download-url-cache');

downloadUrlCacheDb.version(1).stores({
  urls: 'cacheKey, expiresAt',
});

/** 만료 60초 전이면 재생성 (여유 버퍼) */
const EXPIRE_BUFFER_MS = 60 * 1000;

/**
 * @typedef {Object} CachedDownloadUrl
 * @property {string} cacheKey - bucket:key
 * @property {string} bucket
 * @property {string} key
 * @property {string} url - presigned URL
 * @property {number} expiresAt - 만료 시각 (timestamp)
 */

/**
 * 캐시에서 유효한 presigned URL 조회
 * @param {string} bucket
 * @param {string} key
 * @returns {Promise<string|null>} 유효한 URL이 있으면 반환, 없으면 null
 */
export async function getCachedDownloadUrl(bucket, key) {
  const cacheKey = `${bucket}:${key}`;
  const record = await downloadUrlCacheDb.urls.where('cacheKey').equals(cacheKey).first();
  if (!record) return null;
  const now = Date.now();
  if (record.expiresAt <= now + EXPIRE_BUFFER_MS) return null;
  return record.url;
}

/**
 * presigned URL을 캐시에 저장
 * @param {Object} params
 * @param {string} params.bucket
 * @param {string} params.key
 * @param {string} params.url
 * @param {number} params.expiresAt - 만료 시각 (timestamp)
 */
export async function setCachedDownloadUrl({ bucket, key, url, expiresAt }) {
  const cacheKey = `${bucket}:${key}`;
  await downloadUrlCacheDb.urls.put({
    cacheKey,
    bucket,
    key,
    url,
    expiresAt,
  });
}
