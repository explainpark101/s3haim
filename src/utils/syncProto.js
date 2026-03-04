/**
 * Sync 데이터 Protobuf 인코딩/디코딩
 * 형식: [{ time: number, line: number, text: string }, ...]
 */
import protobuf from 'protobufjs';

const JSON_DESCRIPTOR = {
  nested: {
    SyncEntry: {
      fields: {
        time: { type: 'double', id: 1 },
        line: { type: 'int32', id: 2 },
        text: { type: 'string', id: 3 },
      },
    },
    SyncData: {
      fields: {
        entries: { rule: 'repeated', type: 'SyncEntry', id: 1 },
      },
    },
  },
};

let SyncDataType = null;

function getSyncDataType() {
  if (!SyncDataType) {
    const root = protobuf.Root.fromJSON(JSON_DESCRIPTOR);
    SyncDataType = root.lookupType('SyncData');
  }
  return SyncDataType;
}

/**
 * syncData 배열을 Protobuf 바이너리로 인코딩
 * @param {Array<{ time: number, line: number, text: string }>} syncData
 * @returns {Uint8Array}
 */
export function encodeSyncData(syncData) {
  if (!Array.isArray(syncData) || syncData.length === 0) {
    return new Uint8Array(0);
  }
  const Type = getSyncDataType();
  const payload = {
    entries: syncData.map((e) => ({
      time: Number(e.time ?? 0),
      line: Number(e.line ?? 0) | 0,
      text: String(e.text ?? ''),
    })),
  };
  const err = Type.verify(payload);
  if (err) throw new Error(`syncProto encode: ${err}`);
  const message = Type.create(payload);
  return Type.encode(message).finish();
}

/**
 * Protobuf 바이너리를 syncData 배열로 디코딩
 * @param {Uint8Array|ArrayBuffer} buffer
 * @returns {Array<{ time: number, line: number, text: string }>}
 */
export function decodeSyncData(buffer) {
  const arr = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  if (!arr || arr.length === 0) return [];
  const Type = getSyncDataType();
  const message = Type.decode(arr);
  const obj = Type.toObject(message, { defaults: true });
  const entries = obj.entries ?? [];
  return entries.map((e) => ({
    time: Number(e.time ?? 0),
    line: Number(e.line ?? 0) | 0,
    text: String(e.text ?? ''),
  }));
}
