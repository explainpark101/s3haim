import { levelToColor } from '@/hooks/useRecording';

/**
 * 입력 소리 레벨을 회색~빨간색 색상으로 표현하는 인디케이터
 * topbar의 cloud icon 대신 표시
 */
export default function AudioLevelIndicator({ level = 0, size = 16, className = '' }) {
  const color = levelToColor(level);
  return (
    <span
      className={`inline-flex shrink-0 rounded-full transition-colors duration-75 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
      title={`녹음 중 - 입력 레벨 ${Math.round(level * 100)}%`}
      aria-label={`녹음 중, 입력 레벨 ${Math.round(level * 100)}%`}
    />
  );
}
