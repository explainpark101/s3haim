/**
 * note-with-recording: 녹음 → S3 업로드 파이프라인
 * FFmpeg 없이 MediaRecorder 출력(webm/mp4)을 그대로 업로드
 * - Chrome/Firefox/Edge: webm
 * - Safari: mp4
 */
import { putObject } from './s3Client';
import { updateRecordingStatus } from './recordingDb';
import { encodeSyncData } from './syncProto';
import { compileSyncData } from './compileSyncData';

/**
 * mimeType으로 확장자 결정
 */
function getExtensionFromMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') return 'webm';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}

/**
 * noteKey에서 base 경로 추출 (notes/회의록.md → notes/회의록)
 */
export function getNoteBase(noteKey) {
  if (!noteKey || typeof noteKey !== 'string') return '';
  const lastDot = noteKey.lastIndexOf('.');
  return lastDot <= 0 ? noteKey : noteKey.slice(0, lastDot);
}

/**
 * noteKey + mimeType + timestamp → 고유 오디오 S3 키 (여러 녹음 지원)
 * @param {string} noteKey - 예: notes/회의록.md
 * @param {string} [mimeType] - audioBlob.type
 * @param {number} [timestamp] - Date.now(), 없으면 단일 녹음용 (하위 호환)
 */
export function getAudioKey(noteKey, mimeType, timestamp) {
  if (!noteKey || typeof noteKey !== 'string') return null;
  const ext = getExtensionFromMimeType(mimeType);
  const base = getNoteBase(noteKey);
  if (timestamp != null) {
    return `${base}-rec-${timestamp}.${ext}`;
  }
  return `${base}.${ext}`;
}

/**
 * noteKey에 해당하는 녹음 키의 sync Protobuf 키
 */
export function getSyncKeyForRecording(audioKey) {
  if (!audioKey || typeof audioKey !== 'string') return null;
  const lastDot = audioKey.lastIndexOf('.');
  if (lastDot <= 0) return null;
  return audioKey.slice(0, lastDot) + '.sync.pb';
}

/** @deprecated 하위 호환 - getRecordingKeysFromTree 사용 권장 */
export function getAudioKeyCandidates(noteKey) {
  return [];
}

/**
 * noteKey → 동기화 Protobuf 키 (녹음별)
 */
export function getSyncKey(noteKey, timestamp) {
  if (!noteKey || typeof noteKey !== 'string') return null;
  const base = getNoteBase(noteKey);
  if (timestamp != null) {
    return `${base}-rec-${timestamp}.sync.pb`;
  }
  return `${base}.sync.pb`;
}

/**
 * 녹음 결과를 S3에 업로드 (인코딩 없음)
 * @param {Object} params
 * @param {Object} params.recording - { audioBlob, syncData, noteKey }
 * @param {import('@aws-sdk/client-s3').S3Client} params.client
 * @param {string} params.bucket
 * @param {number} [params.recordId] - IndexedDB id (상태 업데이트용)
 * @param {(msg: string) => void} [params.onStatus]
 */
export async function runEncodeAndUploadPipeline({
  recording,
  client,
  bucket,
  recordId,
  onStatus,
}) {
  const { audioBlob, syncData, noteKey } = recording;
  const timestamp = Date.now();
  const audioKey = getAudioKey(noteKey, audioBlob?.type, timestamp);
  const syncKey = getSyncKey(noteKey, timestamp);

  if (!audioKey) throw new Error('유효한 noteKey가 필요합니다.');

  onStatus?.('업로드 중');

  if (recordId) {
    await updateRecordingStatus(recordId, { status: 'uploading' });
  }

  const contentType = audioBlob?.type?.includes('mp4') ? 'audio/mp4' : 'audio/webm';

  // Blob을 Uint8Array로 변환 (AWS SDK 브라우저 환경에서 Blob 직접 전달 시 getReader 오류 방지)
  const body = new Uint8Array(await audioBlob.arrayBuffer());

  await putObject(client, {
    Bucket: bucket,
    Key: audioKey,
    Body: body,
    ContentType: contentType,
  });

  if (syncKey && syncData?.length > 0) {
    const compiled = compileSyncData(syncData);
    const syncBody = encodeSyncData(compiled);
    await putObject(client, {
      Bucket: bucket,
      Key: syncKey,
      Body: syncBody,
      ContentType: 'application/x-protobuf',
    });
  }

  if (recordId) {
    await updateRecordingStatus(recordId, { status: 'uploaded' });
  }

  onStatus?.('완료');
  return { audioKey, syncKey };
}
