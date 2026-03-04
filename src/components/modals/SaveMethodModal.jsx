import { useState } from 'react';
import { IconKey, IconFingerprint } from '@/components/icons';
import { getWebAuthnEncryptLabel } from '@/utils/webauthnLabel';
import Modal from '@/components/modals/Modal';

export function SaveMethodModal({
  isOpen,
  onClose,
  creds,
  webauthnSupported,
  onSaveWithWebAuthn,
  onSaveWithPassword,
}) {
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const webauthnLabel = getWebAuthnEncryptLabel();

  const handleWebAuthnClick = async () => {
    if (!onSaveWithWebAuthn || !creds) return;
    let promise;
    try {
      promise = onSaveWithWebAuthn(creds);
    } catch (e) {
      alert(e?.message || '저장에 실패했습니다.');
      return;
    }
    setWebauthnLoading(true);
    try {
      await promise;
      onClose();
    } catch (e) {
      alert(e?.message || '저장에 실패했습니다.');
    } finally {
      setWebauthnLoading(false);
    }
  };

  const handlePasswordClick = () => {
    onSaveWithPassword?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen}>
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-odp-fgStrong mb-2">저장 방식 선택</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          S3 연결 정보를 어떻게 암호화하여 저장할지 선택하세요.
        </p>

        <div className="flex flex-col gap-3">
          {webauthnSupported && (
            <button
              type="button"
              onClick={handleWebAuthnClick}
              disabled={webauthnLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition shadow-sm"
              aria-label={`${webauthnLabel}(으)로 암호화하여 저장`}
            >
              <IconFingerprint className="w-5 h-5 shrink-0" />
              {webauthnLoading ? '저장 중…' : `${webauthnLabel}(으)로 암호화하여 저장`}
            </button>
          )}
          <button
            type="button"
            onClick={handlePasswordClick}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg text-gray-800 dark:text-odp-fgStrong font-medium py-3 rounded-lg transition"
            aria-label="비밀번호로 암호화하여 저장"
          >
            <IconKey className="w-5 h-5 shrink-0" />
            비밀번호로 암호화하여 저장
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-odp-fgStrong underline transition"
        >
          취소
        </button>
      </div>
    </Modal>
  );
}
