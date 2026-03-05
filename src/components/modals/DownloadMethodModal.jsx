import Modal from '@/components/modals/Modal';
import { IconDownload, IconFolder } from '@/components/icons';

export function DownloadMethodModal({
  isOpen,
  fileName,
  onSelectLegacy,
  onSelectStorageApi,
  onCancel,
  isDownloading,
  downloadProgress,
  downloadComplete,
  onCloseComplete,
}) {
  const showProgress = isDownloading || downloadComplete;

  return (
    <Modal isOpen={isOpen}>
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-odp-fgStrong mb-2">
          다운로드 방식 선택
        </h2>
        {fileName && (
          <p className="text-sm text-gray-500 dark:text-odp-muted mb-4 truncate" title={fileName}>
            {fileName}
          </p>
        )}

        {showProgress ? (
          <div className="space-y-4">
            {downloadComplete ? (
              <>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <span className="text-sm font-medium">저장 완료</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  선택한 폴더에 파일이 저장되었습니다. 파일 탐색기에서 해당 파일을 더블클릭하여 열어보세요.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onCloseComplete}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded transition"
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>다운로드 중...</span>
                    <span>{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={onSelectLegacy}
                disabled={isDownloading}
                className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-odp-borderSoft hover:bg-gray-50 dark:hover:bg-odp-bgSoft transition flex items-center gap-3"
              >
                <IconDownload size={20} className="text-gray-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-gray-800 dark:text-odp-fgStrong">
                    기존 다운로드 방식
                  </div>
                  <div className="text-xs text-gray-500 dark:text-odp-muted mt-0.5">
                    브라우저 기본 다운로드. ~100–200MB 권장
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={onSelectStorageApi}
                disabled={isDownloading}
                className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 dark:border-odp-borderSoft hover:bg-gray-50 dark:hover:bg-odp-bgSoft transition flex items-center gap-3"
              >
                <IconFolder size={20} className="text-gray-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-gray-800 dark:text-odp-fgStrong">
                    Storage API를 이용한 방식
                  </div>
                  <div className="text-xs text-gray-500 dark:text-odp-muted mt-0.5">
                    폴더 선택 후 직접 저장. 대용량 파일 지원, 진행률 표시
                  </div>
                </div>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-odp-fgStrong bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
              >
                취소
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
