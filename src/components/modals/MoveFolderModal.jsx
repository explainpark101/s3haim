import { useState, useMemo } from 'react';
import Modal from '@/components/modals/Modal';
import { IconFolder } from '@/components/icons';

function FolderNode({ node, level, onSelect, selectedPath }) {
  if (node.type !== 'folder') return null;

  const [open, setOpen] = useState(true);
  const paddingLeft = `${level * 12 + 8}px`;
  const isSelected = selectedPath === node.path;

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    onSelect(node);
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between py-1 pr-2 cursor-pointer text-sm ${
          isSelected
            ? 'bg-blue-50 text-blue-700 dark:bg-odp-line dark:text-odp-fgStrong'
            : 'text-gray-700 hover:bg-gray-100 dark:text-odp-fg dark:hover:bg-odp-bgSoft'
        }`}
        style={{ paddingLeft }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-gray-400 dark:text-gray-500 w-4 flex justify-center shrink-0">
            {open ? '▾' : '▸'}
          </span>
          <button
            type="button"
            onClick={handleSelect}
            className="flex items-center gap-1 min-w-0 text-left"
          >
            <span className="text-gray-500 dark:text-gray-300 shrink-0">
              <IconFolder size={14} />
            </span>
            <span className="truncate">{node.name || '/'}</span>
          </button>
        </div>
      </div>
      {open &&
        node.children?.map((child) =>
          child.type === 'folder' ? (
            <FolderNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ) : null,
        )}
    </div>
  );
}

function filterFoldersForMove(nodes, movingFolderPath) {
  if (!nodes || !Array.isArray(nodes)) return [];
  return nodes
    .filter(
      (n) =>
        n.type === 'folder' &&
        n.path !== movingFolderPath &&
        !n.path.startsWith(movingFolderPath),
    )
    .map((n) => ({
      ...n,
      children: n.children ? filterFoldersForMove(n.children, movingFolderPath) : [],
    }));
}

export function MoveFolderModal({
  isOpen,
  storageType,
  s3Tree,
  localTree,
  localRootHandle,
  folderNode,
  onClose,
  onConfirm,
}) {
  if (!folderNode || folderNode.type !== 'folder') return null;

  const isS3 = storageType === 's3';
  const tree = isS3 ? s3Tree : localTree;
  const filteredTree = useMemo(
    () => filterFoldersForMove(tree, folderNode.path),
    [tree, folderNode.path],
  );

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedRoot, setSelectedRoot] = useState(true);

  const handleSelectRoot = () => {
    setSelectedRoot(true);
    setSelectedFolder(null);
  };

  const handleSelectFolder = (node) => {
    setSelectedRoot(false);
    setSelectedFolder(node);
  };

  const handleSubmit = () => {
    if (!onConfirm) return;

    if (isS3) {
      const destPath = selectedRoot ? '' : selectedFolder?.path || '';
      onConfirm({ path: destPath });
    } else {
      const destPath = selectedRoot ? '' : selectedFolder?.path || '';
      const destHandle = selectedRoot ? localRootHandle : selectedFolder?.handle;
      onConfirm({ path: destPath, handle: destHandle });
    }
  };

  const canSubmit = isS3 ? true : !!(selectedRoot ? localRootHandle : selectedFolder?.handle);

  return (
    <Modal isOpen={isOpen}>
      <div className="p-6 flex flex-col gap-4 max-h-[90vh]">
        <h2 className="text-lg font-bold text-gray-800 dark:text-odp-fgStrong">
          폴더 위치 이동
        </h2>
        <p className="text-xs text-gray-500 dark:text-odp-muted">
          이동할 대상 폴더를 선택하세요. 이동할 폴더:{' '}
          <span className="font-mono text-[11px]">{folderNode.name}</span>
        </p>
        <div className="border border-gray-200 dark:border-odp-borderSoft rounded-lg overflow-hidden bg-gray-50 dark:bg-odp-bgSoft text-sm flex-1 min-h-[200px] max-h-[320px] flex flex-col">
          <button
            type="button"
            onClick={handleSelectRoot}
            className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-odp-borderSoft text-left ${
              selectedRoot
                ? 'bg-blue-50 text-blue-700 dark:bg-odp-line dark:text-odp-fgStrong'
                : 'text-gray-700 hover:bg-gray-100 dark:text-odp-fg dark:hover:bg-odp-bgSoft'
            }`}
          >
            <IconFolder size={14} />
            <span className="truncate">
              {isS3 ? '루트 (버킷 최상위)' : '루트 폴더'}
            </span>
          </button>
          <div className="flex-1 overflow-auto py-1">
            {filteredTree && filteredTree.length > 0 ? (
              filteredTree.map((node) => (
                <FolderNode
                  key={node.path}
                  node={node}
                  level={0}
                  onSelect={handleSelectFolder}
                  selectedPath={!selectedRoot ? selectedFolder?.path : null}
                />
              ))
            ) : (
              <div className="px-3 py-4 text-xs text-gray-400 dark:text-odp-muted">
                사용할 수 있는 폴더가 없습니다.
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-odp-fgStrong bg-gray-100 dark:bg-odp-bgSoft hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition ${
              canSubmit
                ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            이동
          </button>
        </div>
      </div>
    </Modal>
  );
}
