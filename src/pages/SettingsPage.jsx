import React from 'react';
import { IconDownload, IconSettings, IconUpload } from '@/components/icons';

export default function SettingsPage({
  s3Creds,
  masterPassword,
  onChangeCreds,
  onExportCreds,
  onImportClick,
  onOpenSetPasswordModal,
  showHiddenFolders,
  onToggleHiddenFolders,
  onClose,
}) {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-odp-bgSofter min-w-0 max-h-full">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-odp-surface flex justify-between items-center bg-gray-50 dark:bg-odp-surface shrink-0">
        <h2 className="font-bold text-gray-700 dark:text-odp-fgStrong flex items-center gap-2">
          <IconSettings /> 설정 및 암호화
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1 rounded transition"
        >
          닫기
        </button>
      </div>

      <div className="p-6 overflow-y-auto space-y-6 flex-1">
        {/* S3 Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onOpenSetPasswordModal();
          }}
          className="space-y-4"
        >
          <div>
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">S3 연결 정보</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Access Key ID
                </label>
                <input
                  type="text"
                  required
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={s3Creds.accessKeyId}
                  onChange={(e) => onChangeCreds('accessKeyId', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Secret Access Key
                </label>
                <input
                  type="password"
                  required
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={s3Creds.secretAccessKey}
                  onChange={(e) => onChangeCreds('secretAccessKey', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Region</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={s3Creds.region}
                  onChange={(e) => onChangeCreds('region', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Bucket Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={s3Creds.bucket}
                  onChange={(e) => onChangeCreds('bucket', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Endpoint URL (선택)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={s3Creds.endpoint || ''}
                  onChange={(e) => onChangeCreds('endpoint', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              저장
            </button>
          </div>
        </form>

        {/* Import / Export Section */}
        <div className="bg-gray-50 dark:bg-odp-surface p-4 rounded-lg border border-gray-200 dark:border-odp-borderStrong">
          <h3 className="text-sm font-bold text-gray-700 dark:text-odp-fgStrong mb-2">데이터 백업/복원</h3>
          <div className="flex gap-2">
            <button
              onClick={onExportCreds}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded transition"
            >
              <IconDownload /> 내보내기 (.json)
            </button>
            <button
              onClick={onImportClick}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded transition"
            >
              <IconUpload /> 불러오기
            </button>
          </div>
        </div>

        {/* Hidden Folders Option */}
        <div className="bg-gray-50 dark:bg-odp-surface p-4 rounded-lg border border-gray-200 dark:border-odp-borderStrong">
          <h3 className="text-sm font-bold text-gray-700 dark:text-odp-fgStrong mb-2">표시 옵션</h3>
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-odp-fg">
            <input
              type="checkbox"
              checked={showHiddenFolders}
              onChange={onToggleHiddenFolders}
              className="w-3 h-3 accent-blue-500"
            />
            <span>숨김 폴더 보기 (이름이 `.` 으로 시작하는 폴더)</span>
          </label>
        </div>
      </div>

      {/* 간단한 비밀번호 안내 */}
      {!masterPassword && (
        <div className="px-6 py-3 border-t border-gray-100 dark:border-odp-surface bg-yellow-50 dark:bg-odp-warningSoft text-xs text-yellow-800 dark:text-odp-warningText">
          아직 마스터 비밀번호가 설정되지 않았습니다. 저장 시 비밀번호를 설정해야 합니다.
        </div>
      )}
    </div>
  );
}

