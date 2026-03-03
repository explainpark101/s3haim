import React from 'react';
import { IconLock } from '@/components/icons';
import Modal from '@/components/modals/Modal';

export function AuthModal({ isOpen, onUnlock, fileInputRef }) {
  return (
    <Modal isOpen={isOpen}>
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconLock size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-odp-fgStrong mb-2">저장소 잠금 해제</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          S3 연결 정보를 복호화하기 위해 마스터 비밀번호를 입력하세요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUnlock(e.target.password.value);
          }}
        >
          <input
            type="password"
            name="password"
            required
            autoFocus
            placeholder="마스터 비밀번호"
            className="w-full border border-gray-300 dark:border-odp-borderStrong bg-white dark:bg-odp-bgSoft text-gray-800 dark:text-odp-fgStrong rounded-lg px-4 py-3 text-center mb-4 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-odp-warningText transition"
          />
          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium py-3 rounded-lg transition shadow-sm mb-4"
          >
            잠금 해제
          </button>
        </form>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-[#f0f0f0] underline transition"
        >
          기존 연결 정보 파일(.json) 불러오기
        </button>
      </div>
    </Modal>
  );
}

