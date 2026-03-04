/**
 * 업로드 실패 시 임시 저장 (IndexedDB)
 * 로그인 후 동기화 시 서버 LastModified와 비교하여 .tmp.{ISOTime}.{suffix} 업로드 여부 결정
 */
import Dexie from 'dexie';

export const pendingUploadsDb = new Dexie('s3haim-pending-uploads');

pendingUploadsDb.version(1).stores({
  uploads: '++id, key, modifiedAt',
});

/**
 * @typedef {Object} PendingUpload
 * @property {number} [id]
 * @property {string} key - S3 키 (예: notes/회의록.md)
 * @property {string} content - 파일 내용
 * @property {number} modifiedAt - 로컬 수정 시각 (timestamp)
 * @property {string} contentType - Content-Type
 * @property {number} createdAt - 저장 시각
 */

/**
 * 업로드 실패 파일을 IndexedDB에 저장
 * @param {Object} params
 * @param {string} params.key
 * @param {string} params.content
 * @param {number} params.modifiedAt
 * @param {string} params.contentType
 * @returns {Promise<number>}
 */
export async function savePendingUpload({ key, content, modifiedAt, contentType }) {
  const now = Date.now();
  const existing = await pendingUploadsDb.uploads.where('key').equals(key).first();
  const record = {
    key,
    content,
    modifiedAt: modifiedAt ?? now,
    contentType: contentType ?? 'text/plain',
    createdAt: now,
  };
  if (existing) {
    await pendingUploadsDb.uploads.update(existing.id, record);
    return existing.id;
  }
  return pendingUploadsDb.uploads.add(record);
}

/**
 * 대기 중인 업로드 목록 조회
 * @returns {Promise<PendingUpload[]>}
 */
export async function getPendingUploads() {
  return pendingUploadsDb.uploads.toArray();
}

/**
 * 업로드 완료 후 삭제
 * @param {number} id
 */
export async function deletePendingUpload(id) {
  await pendingUploadsDb.uploads.delete(id);
}

/**
 * 키로 대기 중인 업로드 삭제
 * @param {string} key
 */
export async function deletePendingUploadByKey(key) {
  await pendingUploadsDb.uploads.where('key').equals(key).delete();
}
