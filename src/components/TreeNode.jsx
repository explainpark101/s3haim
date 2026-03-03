import React, { useState } from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconFile,
  IconFilePlus,
  IconFolder,
  IconFolderPlus,
  IconTrash,
} from '@/components/icons';
import { PencilIcon } from 'lucide-react';

export default function TreeNode({
  node,
  level,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onDelete,
  currentFileId,
  storageType,
  onRename,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(node.name);
  const isSelected = currentFileId === node.path;
  const paddingLeft = `${level * 12 + 8}px`;

  const isTrashRoot = node.path === '.trash/';
  const displayName = isTrashRoot ? '쓰레기통' : node.name;

  const baseName = node.name.includes('.')
    ? node.name.slice(0, node.name.lastIndexOf('.'))
    : node.name;
  const extension = node.name.includes('.')
    ? node.name.slice(node.name.lastIndexOf('.'))
    : '';

  const handleToggle = (e) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen((prev) => !prev);
    } else {
      onSelect(storageType, node);
    }
  };

  const handleRenameStart = (e) => {
    e.stopPropagation();
    if (node.type !== 'file') return;
    setTempName(baseName);
    setIsRenaming(true);
  };

  const commitRename = () => {
    if (node.type !== 'file') {
      setIsRenaming(false);
      return;
    }
    const trimmed = tempName.trim();
    const originalBase = baseName;

    if (!trimmed) {
      setTempName(originalBase);
      setIsRenaming(false);
      return;
    }

    if (trimmed.includes('/')) {
      alert("파일 이름에는 '/' 문자를 사용할 수 없습니다.");
      setTempName(originalBase);
      setIsRenaming(false);
      return;
    }

    if (trimmed === originalBase) {
      setIsRenaming(false);
      return;
    }

    const newTitle = trimmed; // extension은 고정, 상위에서 붙임
    if (typeof onRename === 'function') {
      onRename(storageType, node, newTitle);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setTempName(baseName);
      setIsRenaming(false);
    }
  };

  return (
    <div>
      <div
        className={`group flex items-center justify-between py-1.5 pr-2 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700 dark:bg-odp-line dark:text-odp-fgStrong'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-odp-bgSoft'
        }`}
        style={{ paddingLeft }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-gray-400 dark:text-gray-500 w-4 flex justify-center shrink-0">
            {node.type === 'folder' ? (isOpen ? <IconChevronDown /> : <IconChevronRight />) : null}
          </span>
          <span className="text-gray-500 dark:text-gray-300 shrink-0">
            {node.type === 'folder' ? (isTrashRoot ? <IconTrash /> : <IconFolder />) : <IconFile />}
          </span>
          {isRenaming && node.type === 'file' && !isTrashRoot ? (
            <span className="flex items-baseline gap-1 min-w-0">
              <input
                className="bg-transparent border-none outline-none text-sm font-medium truncate placeholder:text-gray-400 dark:placeholder:text-gray-500"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                placeholder={baseName || '이름 없음'}
              />
              {extension && (
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {extension}
                </span>
              )}
            </span>
          ) : (
            <span
              className={`text-sm truncate select-none ${
                isTrashRoot ? 'font-semibold text-red-600 dark:text-red-400' : ''
              }`}
            >
              {displayName}
            </span>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
          {node.type === 'folder' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFile(node.path, node.handle);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                title="파일 생성"
              >
                <IconFilePlus />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFolder(node.path, node.handle);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                title="폴더 생성"
              >
                <IconFolderPlus />
              </button>
            </>
          )}
          {node.type === 'file' && !isTrashRoot && (
            <button
              onClick={handleRenameStart}
              className="px-2 py-1 text-[11px] rounded text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-odp-focusBg"
              title="파일명 수정"
            >
              <PencilIcon className="size-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node, storageType);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded text-gray-500 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
            title="삭제"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {isOpen &&
        node.type === 'folder' &&
        node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            level={level + 1}
            onSelect={onSelect}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDelete={onDelete}
            currentFileId={currentFileId}
            storageType={storageType}
          />
        ))}
    </div>
  );
}

