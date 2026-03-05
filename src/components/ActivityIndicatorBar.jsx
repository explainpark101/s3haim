/**
 * 하단바 활동 인디케이터
 * - 파일 업로드, 녹음 처리, 필기 저장, 사진 업로드 등 진행 중인 작업 표시
 * - useActivityIndicator 훅으로 등록된 항목만 렌더링
 */
import { useActivityIndicator, ActivityTypes } from '@/contexts/ActivityIndicatorContext';
import { IconUpload, IconMic, IconPenLine, IconImage, IconLoader } from '@/components/icons';

const typeConfig = {
  [ActivityTypes.FILE_UPLOAD]: {
    icon: IconUpload,
    label: '파일 업로드',
  },
  [ActivityTypes.RECORDING]: {
    icon: IconMic,
    label: '녹음 처리',
  },
  [ActivityTypes.NOTE_PROCESSING]: {
    icon: IconPenLine,
    label: '필기 저장',
  },
  [ActivityTypes.PHOTO_UPLOAD]: {
    icon: IconImage,
    label: '사진 업로드',
  },
};

function IndicatorItem({ indicator }) {
  const config = typeConfig[indicator.type] || {
    icon: IconLoader,
    label: indicator.label || '처리 중',
  };
  const Icon = config.icon;
  const displayLabel = indicator.label ?? config.label;
  const isActive = indicator.status === 'pending' || indicator.status === 'processing';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-odp-bgSofter text-gray-700 dark:text-odp-fgStrong text-[10px] md:text-[11px] shrink-0"
      title={indicator.detail || displayLabel}
    >
      {isActive ? (
        <IconLoader size={12} className="animate-spin shrink-0 text-blue-500" />
      ) : (
        <Icon size={12} className="shrink-0" />
      )}
      <span className="truncate max-w-[120px] md:max-w-[180px]">{displayLabel}</span>
      {indicator.detail && (
        <span className="hidden md:inline truncate max-w-[80px] text-gray-500 dark:text-odp-muted">
          {indicator.detail}
        </span>
      )}
      {indicator.progress != null && indicator.progress < 100 && (
        <span className="text-gray-500 dark:text-odp-muted shrink-0">{indicator.progress}%</span>
      )}
    </span>
  );
}

export default function ActivityIndicatorBar() {
  const { indicators } = useActivityIndicator();
  const activeIndicators = indicators.filter(
    (i) => i.status === 'pending' || i.status === 'processing'
  );

  if (activeIndicators.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 shrink-0">
      {activeIndicators.map((indicator) => (
        <IndicatorItem key={indicator.id} indicator={indicator} />
      ))}
    </div>
  );
}
