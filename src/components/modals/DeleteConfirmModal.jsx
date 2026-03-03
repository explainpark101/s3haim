import { useEffect, useState } from 'react';
import { IconTrash } from '@/components/icons';
import Modal from '@/components/modals/Modal';

const CLOSE_ANIMATION_MS = 200;

export function DeleteConfirmModal({ target, onCancel, onConfirm, isProcessing = false }) {
  const [displayTarget, setDisplayTarget] = useState(null);

  useEffect(() => {
    if (target) {
      setDisplayTarget(target);
    } else if (displayTarget) {
      const t = setTimeout(() => setDisplayTarget(null), CLOSE_ANIMATION_MS);
      return () => clearTimeout(t);
    }
  }, [target, displayTarget]);

  if (!target && !displayTarget) return null;

  const data = target || displayTarget;
  const isInTrash = data.node.path?.startsWith('.trash/');
  const isTrashRoot = data.node.path === '.trash/';

  return (
    <Modal isOpen={!!target}>
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-odp-fgStrong mb-2 flex items-center gap-2">
          <IconTrash />{' '}
          {isTrashRoot ? '쓰레기통 비우기' : isInTrash ? '영구 삭제 확인' : '삭제 확인'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {isTrashRoot ? (
            <>
              <span className="font-semibold text-red-600">쓰레기통</span>의 항목을 모두
              비우시겠습니까?
              <br />
              실제 파일은 삭제되지 않으며, 안전 확인용 동작입니다.
            </>
          ) : (
            <>
              <span className="font-semibold text-red-600">{data.node.name}</span>{' '}
              {isInTrash ? '항목을 영구적으로 삭제합니다.' : '항목을 쓰레기통으로 이동합니다.'}
              <br />
              {data.node.type === 'folder' &&
                (isInTrash
                  ? '해당 폴더 내의 모든 파일이 함께 삭제됩니다. '
                  : '해당 폴더 내의 모든 파일이 함께 이동됩니다. ')}
              {isInTrash
                ? '이 작업은 되돌릴 수 없습니다.'
                : '쓰레기통에서 다시 삭제하면 영구적으로 삭제됩니다.'}
            </>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-odp-fgStrong bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={isProcessing ? undefined : onConfirm}
            disabled={isProcessing || !target}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition ${
              isProcessing
                ? 'bg-red-400 cursor-wait'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isTrashRoot
              ? isProcessing
                ? '비우는 중...'
                : '비우기'
              : isProcessing
              ? '삭제 중...'
              : '삭제'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

