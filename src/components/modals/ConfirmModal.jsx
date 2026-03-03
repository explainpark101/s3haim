import Modal from '@/components/modals/Modal';

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen}>
      <div className="p-6">
        {title && (
          <h2 className="text-lg font-bold text-gray-800 dark:text-odp-fgStrong mb-2">
            {title}
          </h2>
        )}
        {message && (
          <p className="text-sm whitespace-pre-line text-gray-600 dark:text-gray-400 mb-4">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-odp-fgStrong bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

