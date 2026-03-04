/**
 * syncData 컴파일: 새 라인 삽입 이벤트를 반영하여 line index 조정
 * insert: true인 항목이 있을 때마다, 그 이전에 기록된 항목들 중
 * line >= 삽입위치 인 것들에 +1 적용
 *
 * @param {Array<{ time: number, line: number, text: string, insert?: boolean }>} syncData
 * @returns {Array<{ time: number, line: number, text: string }>} 컴파일된 syncData (insert 필드 제거)
 */
export function compileSyncData(syncData) {
  if (!Array.isArray(syncData) || syncData.length === 0) return syncData;

  const result = syncData.map((e) => ({ ...e }));

  for (let i = 0; i < result.length; i++) {
    const entry = result[i];
    if (!entry.insert) continue;

    const insertAt = entry.line;
    for (let j = 0; j < i; j++) {
      if (result[j].line >= insertAt) {
        result[j].line += 1;
      }
    }
  }

  return result.map(({ insert, ...rest }) => rest);
}
