/**
 * note-with-recording: IndexedDB (Dexie) 로컬 녹음 데이터 저장
 * 저장 대상: 원본 오디오 Blob, 마크다운 텍스트, 동기화 JSON
 */
import Dexie from 'dexie';

export const db = new Dexie('s3haim-recordings');

db.version(1).stores({
  recordings:
    '++id, noteKey, createdAt, status',
});

/**
 * @typedef {Object} RecordingRecord
 * @property {number} [id]
 * @property {string} noteKey - S3 경로 (예: notes/회의록.md)
 * @property {Blob} audioBlob - 원본 webm/opus Blob
 * @property {string} markdown - 녹음 시점 마크다운
 * @property {Array<{time: number, line: number, text: string}>} syncData - 필기 트래킹
 * @property {number} createdAt - timestamp
 * @property {'pending'|'encoding'|'uploading'|'uploaded'|'failed'} status
 * @property {string} [error]
 */

/**
 * 녹음 데이터를 IndexedDB에 저장
 * @param {Object} params
 * @param {string} params.noteKey
 * @param {Blob} params.audioBlob
 * @param {string} params.markdown
 * @param {Array<{time: number, line: number, text: string}>} params.syncData
 * @returns {Promise<number>} id
 */
export async function saveRecording({ noteKey, audioBlob, markdown, syncData }) {
  return db.recordings.add({
    noteKey,
    audioBlob,
    markdown: markdown ?? '',
    syncData: syncData ?? [],
    createdAt: Date.now(),
    status: 'pending',
  });
}

/**
 * noteKey로 대기 중인 녹음 조회
 * @param {string} noteKey
 * @returns {Promise<RecordingRecord|null>}
 */
export async function getPendingRecording(noteKey) {
  const list = await db.recordings
    .where('noteKey')
    .equals(noteKey)
    .filter((r) => r.status === 'pending')
    .limit(1)
    .toArray();
  return list[0] ?? null;
}

/**
 * 녹음 상태 업데이트
 * @param {number} id
 * @param {Partial<RecordingRecord>} updates
 */
export async function updateRecordingStatus(id, updates) {
  return db.recordings.update(id, updates);
}

/**
 * noteKey에 해당하는 업로드 완료 녹음 삭제 (중복 방지용)
 * @param {string} noteKey
 */
export async function deleteRecordingsByNoteKey(noteKey) {
  return db.recordings.where('noteKey').equals(noteKey).delete();
}
