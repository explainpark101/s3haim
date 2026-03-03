import React from 'react';
import { IconTrash } from '@/components/icons';
import Modal from '@/components/modals/Modal';

export function DeleteConfirmModal({ target, onCancel, onConfirm }) {
  if (!target) return null;

  const isInTrash = target.node.path?.startsWith('.trash/');

  return (
    <Modal isOpen={!!target}>
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-odp-fgStrong mb-2 flex items-center gap-2">
          <IconTrash /> {isInTrash ? '영구 삭제 확인' : '삭제 확인'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <span className="font-semibold text-red-600">{target.node.name}</span>{' '}
          {isInTrash ? '항목을 영구적으로 삭제합니다.' : '항목을 쓰레기통으로 이동합니다.'}
          <br />
          {target.node.type === 'folder' &&
            (isInTrash
              ? '해당 폴더 내의 모든 파일이 함께 삭제됩니다. '
              : '해당 폴더 내의 모든 파일이 함께 이동됩니다. ')}
          {isInTrash
            ? '이 작업은 되돌릴 수 없습니다.'
            : '쓰레기통에서 다시 삭제하면 영구적으로 삭제됩니다.'}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-odp-fgStrong bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition"
          >
            삭제
          </button>
        </div>
      </div>
    </Modal>
  );
}

