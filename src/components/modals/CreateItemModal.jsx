import { useState, useEffect } from 'react';
import { IconFilePlus, IconFolderPlus } from '@/components/icons';
import Modal from '@/components/modals/Modal';

export function CreateItemModal({
  isOpen,
  type,
  parentLabel,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
    }
  }, [isOpen, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.includes('/')) return;
    onSubmit(trimmed);
  };

  const isFolder = type === 'folder';
  const title = isFolder ? '새 폴더' : '새 파일';
  const Icon = isFolder ? IconFolderPlus : IconFilePlus;

  return (
    <Modal isOpen={isOpen}>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-odp-fgStrong mb-2 flex items-center gap-2">
            <Icon size={20} />
            {title}
          </h2>
          {parentLabel && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              위치: {parentLabel}
            </p>
          )}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isFolder ? '폴더 이름' : '파일 이름 (.md 생략 가능)'}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-odp-borderStrong rounded-lg bg-white dark:bg-odp-bgSoft text-gray-800 dark:text-odp-fg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            disabled={isSubmitting}
            aria-label={isFolder ? '폴더 이름' : '파일 이름'}
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-odp-borderSoft flex justify-end gap-2 bg-gray-50 dark:bg-odp-bgSofter">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-odp-fgStrong bg-gray-200 dark:bg-odp-bgSoft hover:bg-gray-300 dark:hover:bg-odp-focusBg rounded-lg transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
          >
            {isSubmitting ? '생성 중...' : '생성'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
