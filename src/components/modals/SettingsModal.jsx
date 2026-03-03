import { IconDownload, IconSettings, IconUpload } from '@/components/icons';
import Modal from '@/components/modals/Modal';

export function SettingsModal({
  isOpen,
  s3Creds,
  onChangeCreds,
  masterPassword,
  onCancel,
  onSubmit,
  onExportCreds,
  onImportClick,
}) {
  return (
    <Modal isOpen={isOpen}>
      <div className="w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-odp-surface flex justify-between items-center bg-gray-50 dark:bg-odp-surface shrink-0">
          <h2 className="font-bold text-gray-700 dark:text-odp-fgStrong flex items-center gap-2">
            <IconSettings /> 설정 및 암호화
          </h2>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* S3 Form */}
          <form
            id="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-odp-fgStrong border-b pb-2 mb-3">
                S3 연결 정보
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-odp-bgSoft border-gray-300 dark:border-odp-borderStrong text-gray-800 dark:text-odp-fgStrong"
                    value={s3Creds.accessKeyId}
                    onChange={(e) => onChangeCreds('accessKeyId', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Secret Access Key
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-odp-bgSoft border-gray-300 dark:border-odp-borderStrong text-gray-800 dark:text-odp-fgStrong"
                    value={s3Creds.secretAccessKey}
                    onChange={(e) => onChangeCreds('secretAccessKey', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-odp-bgSoft border-gray-300 dark:border-odp-borderStrong text-gray-800 dark:text-odp-fgStrong"
                    value={s3Creds.region}
                    onChange={(e) => onChangeCreds('region', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Bucket Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-odp-bgSoft border-gray-300 dark:border-odp-borderStrong text-gray-800 dark:text-odp-fgStrong"
                    value={s3Creds.bucket}
                    onChange={(e) => onChangeCreds('bucket', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Endpoint URL (선택)
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-odp-bgSoft border-gray-300 dark:border-odp-borderStrong text-gray-800 dark:text-odp-fgStrong"
                    value={s3Creds.endpoint || ''}
                    onChange={(e) => onChangeCreds('endpoint', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Import / Export Section */}
          <div className="bg-gray-50 dark:bg-odp-surface p-4 rounded-lg border border-gray-200 dark:border-odp-borderStrong">
            <h3 className="text-sm font-bold text-gray-700 dark:text-odp-fgStrong mb-2">
              데이터 백업/복원
            </h3>
            <div className="flex gap-2">
              <button
                onClick={onExportCreds}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-odp-bgSoft border border-gray-300 dark:border-odp-borderStrong hover:bg-gray-100 dark:hover:bg-odp-focusBg text-gray-700 dark:text-odp-fgStrong text-xs font-semibold py-2 rounded transition"
              >
                <IconDownload /> 내보내기 (.json)
              </button>
              <button
                onClick={onImportClick}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-odp-bgSoft border border-gray-300 dark:border-odp-borderStrong hover:bg-gray-100 dark:hover:bg-odp-focusBg text-gray-700 dark:text-odp-fgStrong text-xs font-semibold py-2 rounded transition"
              >
                <IconUpload /> 불러오기
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-odp-surface bg-white dark:bg-odp-surface shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!masterPassword && localStorage.getItem('s3NotesEncrypted')) {
                onCancel();
              } else if (!masterPassword) {
                alert('마스터 비밀번호를 설정해야 창을 닫을 수 있습니다.');
              } else {
                onCancel();
              }
            }}
            className="px-4 py-2 text-sm text-gray-600 dark:text-odp-fgStrong hover:bg-gray-100 dark:hover:bg-odp-focusBg rounded transition"
          >
            취소
          </button>
          <button
            type="submit"
            form="settings-form"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            저장
          </button>
        </div>
      </div>
    </Modal>
  );
}

