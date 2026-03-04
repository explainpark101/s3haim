import { useState } from 'react';
import { IconDownload } from '@/components/icons';
import Modal from '@/components/modals/Modal';

export function ExportPasswordModal({ isOpen, onConfirm, onCancel }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    onConfirm(password.trim());
    setPassword('');
  };

  const handleClose = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconDownload size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-odp-fgStrong mb-2">백업 파일 내보내기</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          내보낸 JSON 파일을 암호화할 비밀번호를 입력하세요.
          <br />
          복원 시 이 비밀번호가 필요합니다.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            placeholder="내보내기 비밀번호"
            className="w-full border border-gray-300 dark:border-odp-borderStrong bg-white dark:bg-odp-bgSoft text-gray-800 dark:text-odp-fgStrong rounded-lg px-4 py-3 text-center mb-4 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 transition"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg text-gray-700 dark:text-odp-fgStrong font-medium py-3 rounded-lg transition shadow-sm"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition shadow-sm"
            >
              내보내기
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
