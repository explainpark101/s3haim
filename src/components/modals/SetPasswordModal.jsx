import React from 'react';
import { IconKey } from '@/components/icons';
import Modal from '@/components/modals/Modal';

export function SetPasswordModal({ isOpen, masterPassword, onCancel, onSubmit }) {
  return (
    <Modal isOpen={isOpen}>
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconKey size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-odp-fgStrong mb-2">마스터 비밀번호 설정</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          입력하신 S3 자격 증명을 암호화하여 저장합니다.
          <br />
          앱을 켤 때 사용할 비밀번호를 입력하세요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e.target.password.value);
          }}
        >
          <input
            type="password"
            name="password"
            required
            autoFocus
            defaultValue={masterPassword}
            placeholder="비밀번호 입력"
            className="w-full border border-gray-300 dark:border-odp-borderStrong bg-white dark:bg-odp-bgSoft text-gray-800 dark:text-odp-fgStrong rounded-lg px-4 py-3 text-center mb-4 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-odp-accentBlue transition"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg text-gray-700 dark:text-odp-fgStrong font-medium py-3 rounded-lg transition shadow-sm"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition shadow-sm"
            >
              암호화 저장
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

