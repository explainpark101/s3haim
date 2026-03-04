import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

/**
 * syncData에서 라인별 작성 시작 시점(최소 time) 맵 생성
 * line index 대신 text(내용) 기반으로도 저장 - 위쪽에 라인 추가 시 인덱스가 밀리므로
 */
function buildLineToTimeMap(syncData) {
  const mapByLine = new Map();
  const mapByText = new Map();
  for (const e of syncData) {
    const existingLine = mapByLine.get(e.line);
    if (existingLine === undefined || e.time < existingLine) {
      mapByLine.set(e.line, e.time);
    }
    if (e.text != null && e.text !== '') {
      const existingText = mapByText.get(e.text);
      if (existingText === undefined || e.time < existingText) {
        mapByText.set(e.text, e.time);
      }
    }
  }
  return { mapByLine, mapByText };
}

/**
 * 현재 content에서 sync 항목에 해당하는 라인 인덱스 찾기
 * 1) line 인덱스의 내용이 text와 일치하면 line 사용
 * 2) 아니면 content에서 text와 일치하는 라인 검색 (위쪽 삽입 대응)
 */
function findLineIndexForSyncEntry(lines, entry, prevIdx) {
  const { line, text } = entry;
  if (line >= 0 && line < lines.length && (lines[line] ?? '') === (text ?? '')) {
    return line;
  }
  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i] ?? '') === (text ?? '')) candidates.push(i);
  }
  if (candidates.length === 0) return line >= 0 && line < lines.length ? line : -1;
  if (candidates.length === 1) return candidates[0];
  if (prevIdx >= 0) {
    const closest = candidates.reduce((a, b) =>
      Math.abs(a - prevIdx) <= Math.abs(b - prevIdx) ? a : b
    );
    return closest;
  }
  return candidates[0];
}

/**
 * 녹음 재생과 동기화된 노트 뷰
 * 오디오 timeupdate에 맞춰 해당 시간대 작성 중이던 라인 하이라이트
 * 동기화된 라인 클릭 시 해당 시점으로 seek
 */
export default function RecordingSyncView({
  content = '',
  syncData = [],
  audioRef,
  theme = 'light',
}) {
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const containerRef = useRef(null);

  const { mapByLine, mapByText } = useMemo(() => buildLineToTimeMap(syncData), [syncData]);
  const lines = useMemo(() => content.split('\n'), [content]);

  const syncedLineSet = useMemo(() => {
    const set = new Set();
    for (const e of syncData) {
      const idx = findLineIndexForSyncEntry(lines, e, -1);
      if (idx >= 0) set.add(idx);
    }
    return set;
  }, [syncData, lines]);

  const getTimeForLine = useCallback(
    (lineIndex) => {
      const text = lines[lineIndex] ?? '';
      return mapByText.get(text) ?? mapByLine.get(lineIndex);
    },
    [lines, mapByLine, mapByText]
  );

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    let prevIdx = -1;

    const handleTimeUpdate = () => {
      const currentLines = content.split('\n');
      const t = audio.currentTime;
      if (!syncData.length) {
        setHighlightedLine(-1);
        prevIdx = -1;
        return;
      }
      let entry = null;
      for (let i = syncData.length - 1; i >= 0; i--) {
        if (syncData[i].time <= t) {
          entry = syncData[i];
          break;
        }
      }
      const idx = entry ? findLineIndexForSyncEntry(currentLines, entry, prevIdx) : -1;
      prevIdx = idx;
      setHighlightedLine(idx);
      if (idx >= 0 && containerRef.current) {
        const lineEl = containerRef.current.querySelector(`[data-line="${idx}"]`);
        lineEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [syncData, audioRef, content]);

  const handleLineClick = (lineIndex) => {
    const time = getTimeForLine(lineIndex);
    if (time === undefined) return;
    const audio = audioRef?.current;
    if (!audio) return;
    audio.currentTime = time;
  };

  return (
    <div className="flex h-full">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm min-w-0"
      >
        {lines.map((line, i) => {
          const isCurrent = i === highlightedLine;
          const isSynced = syncedLineSet.has(i);
          const canSeek = isSynced && getTimeForLine(i) !== undefined;
          return (
            <div
              key={i}
              data-line={i}
              role={canSeek ? 'button' : undefined}
              tabIndex={canSeek ? 0 : undefined}
              onClick={canSeek ? () => handleLineClick(i) : undefined}
              onKeyDown={canSeek ? (e) => e.key === 'Enter' && handleLineClick(i) : undefined}
              className={`px-2 py-0.5 -mx-2 rounded transition-colors ${
                canSeek
                  ? 'cursor-pointer ' +
                    (isCurrent
                      ? 'hover:bg-blue-300/90 dark:hover:bg-blue-500/60'
                      : 'hover:bg-green-100 dark:hover:bg-green-800/30')
                  : ''
              } ${
                isCurrent
                  ? 'bg-blue-200/80 dark:bg-blue-600/50 text-blue-900 dark:text-blue-100'
                  : isSynced
                    ? 'bg-green-50 dark:bg-green-900/20 text-gray-700 dark:text-odp-fgStrong'
                    : 'text-gray-700 dark:text-odp-fgStrong'
              }`}
              title={canSeek ? '클릭하여 해당 시점으로 이동' : undefined}
            >
              <span className="select-none text-gray-400 dark:text-odp-muted w-8 inline-block mr-2">
                {i + 1}
              </span>
              {line || '\u00A0'}
            </div>
          );
        })}
      </div>
    </div>
  );
}
