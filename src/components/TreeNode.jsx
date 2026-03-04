import { useState, useRef, useEffect } from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconFile,
  IconFileCode,
  IconFileJson,
  IconImage,
  IconMusic,
  IconVideo,
  IconFolder,
  IconTrash,
  IconFilePlus,
  IconFolderPlus,
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
  deletingFolderPath,
  isDeletingFolder,
  isSearching = false,
  onFolderFocus,
  focusedFolderPath,
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

  const titleContainerRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const scrollDirectionRef = useRef(1);

  const isUnderDeletingFolder =
    deletingFolderPath && node.path.startsWith(deletingFolderPath);
  const isDeletingThisFolder =
    isDeletingFolder && node.type === 'folder' && deletingFolderPath === node.path;
  const isFocusedFolder =
    node.type === 'folder' && focusedFolderPath && node.path === focusedFolderPath;

  const getFileIcon = () => {
    if (node.type !== 'file') return IconFile;
    const lower = node.name.toLowerCase();
    const lastDot = lower.lastIndexOf('.');
    const ext = lastDot > -1 ? lower.slice(lastDot + 1) : '';
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
    const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];
    const audioExts = ['m4a', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'weba'];

    if (imageExts.includes(ext)) return IconImage;
    if (videoExts.includes(ext)) return IconVideo;
    if (audioExts.includes(ext)) return IconMusic;
    if (ext === 'pdf') return IconFileJson;
    if (ext === 'md' || ext === 'markdown' || ext === 'mdx') return IconFileCode;
    return IconFile;
  };

  const getIconColorClass = () => {
    if (node.type === 'folder') {
      if (isTrashRoot) return 'text-red-600 dark:text-red-400';
      return 'text-yellow-600 dark:text-yellow-400';
    }
    const lower = node.name.toLowerCase();
    const lastDot = lower.lastIndexOf('.');
    const ext = lastDot > -1 ? lower.slice(lastDot + 1) : '';
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
    const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];
    const audioExts = ['m4a', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'weba'];
    if (imageExts.includes(ext)) return 'text-green-600 dark:text-green-400';
    if (videoExts.includes(ext)) return 'text-orange-600 dark:text-orange-400';
    if (audioExts.includes(ext)) return 'text-purple-600 dark:text-purple-400';
    if (ext === 'pdf') return 'text-red-500 dark:text-red-400';
    if (ext === 'md' || ext === 'markdown' || ext === 'mdx') return 'text-gray-600 dark:text-gray-100';
    return 'text-blue-600 dark:text-blue-400';
  };

  const FileIconComponent = getFileIcon();
  const iconColorClass = getIconColorClass();

  useEffect(() => {
    if (node.type !== 'folder') return;
    if (isSearching) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isSearching, node.type]);

  const startTitleScroll = () => {
    const el = titleContainerRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return;

    if (scrollTimerRef.current) {
      window.clearInterval(scrollTimerRef.current);
    }

    scrollDirectionRef.current = 1;
    scrollTimerRef.current = window.setInterval(() => {
      const target = titleContainerRef.current;
      if (!target) return;

      const dir = scrollDirectionRef.current;
      if (dir > 0) {
        if (target.scrollLeft + target.clientWidth >= target.scrollWidth) {
          scrollDirectionRef.current = -1;
        } else {
          target.scrollLeft += 1;
        }
      } else {
        if (target.scrollLeft <= 0) {
          scrollDirectionRef.current = 1;
        } else {
          target.scrollLeft -= 1;
        }
      }
    }, 30);
  };

  const stopTitleScroll = () => {
    if (scrollTimerRef.current) {
      window.clearInterval(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    if (titleContainerRef.current) {
      titleContainerRef.current.scrollLeft = 0;
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isUnderDeletingFolder) {
      return;
    }
    if (node.type === 'folder') {
      setIsOpen((prev) => !prev);
      if (onFolderFocus) {
        onFolderFocus(node);
      }
    } else {
      if (onFolderFocus && !node.path.includes('/')) {
        onFolderFocus(null);
      }
      onSelect(storageType, node);
    }
  };

  const handleRenameStart = (e) => {
    e.stopPropagation();
    if (isUnderDeletingFolder) return;
    if (node.type !== 'file') return;
    setTempName(baseName);
    setIsRenaming(true);
  };

  const commitRename = () => {
    if (node.type !== 'file' || isUnderDeletingFolder) {
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
        data-tree-node-row
        className={`group flex items-center justify-between py-1.5 pr-2 transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700 dark:bg-odp-line dark:text-odp-fgStrong'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-odp-focusBg'
        } ${isUnderDeletingFolder ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${
          isFocusedFolder
            ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-odp-bgSofter'
            : ''
        }`}
        style={{ paddingLeft }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-gray-400 dark:text-gray-500 w-4 flex justify-center shrink-0">
            {node.type === 'folder' ? (isOpen ? <IconChevronDown /> : <IconChevronRight />) : null}
          </span>
          <span className={`${iconColorClass} shrink-0`}>
            {node.type === 'folder'
              ? isTrashRoot
                ? <IconTrash />
                : <IconFolder />
              : <FileIconComponent />}
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
              ref={titleContainerRef}
              className={`text-sm select-none overflow-hidden whitespace-nowrap ${
                isTrashRoot ? 'font-semibold text-red-600 dark:text-red-400' : ''
              }`}
              title={displayName}
              onMouseEnter={startTitleScroll}
              onMouseLeave={stopTitleScroll}
            >
              {displayName}
            </span>
          )}
        </div>

        <div className="opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
          {node.type === 'folder' && !isTrashRoot && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUnderDeletingFolder) return;
                  const parentPath = node.path.endsWith('/') ? node.path : node.path + '/';
                  if (storageType === 'local') {
                    onCreateFile(parentPath, node.handle);
                  } else {
                    onCreateFile(parentPath);
                  }
                }}
                className="p-1 rounded text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-odp-focusBg"
                title="이 폴더에 파일 추가"
              >
                <IconFilePlus size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUnderDeletingFolder) return;
                  const parentPath = node.path.endsWith('/') ? node.path : node.path + '/';
                  if (storageType === 'local') {
                    onCreateFolder(parentPath, node.handle);
                  } else {
                    onCreateFolder(parentPath);
                  }
                }}
                className="p-1 rounded text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-odp-focusBg"
                title="이 폴더에 폴더 추가"
              >
                <IconFolderPlus size={12} />
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
              if (isUnderDeletingFolder) return;
              onDelete(node, storageType);
            }}
            disabled={isDeletingThisFolder}
            className={`p-1 rounded text-gray-500 dark:text-gray-300 ${
              isDeletingThisFolder
                ? 'opacity-60 cursor-wait'
                : 'hover:bg-gray-200 dark:hover:bg-odp-focusBg hover:text-red-600 dark:hover:text-red-400'
            }`}
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
            onRename={onRename}
            deletingFolderPath={deletingFolderPath}
            isDeletingFolder={isDeletingFolder}
            isSearching={isSearching}
            onFolderFocus={onFolderFocus}
            focusedFolderPath={focusedFolderPath}
          />
        ))}
    </div>
  );
}

