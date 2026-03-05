import { useState, useRef } from 'react';
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
} from '@/components/icons';
import { PencilIcon, ArrowRightToLine } from 'lucide-react';

const DATA_TRANSFER_TYPE = 'application/x-s3haim-tree-node';

export default function TreeNode({
  node,
  level,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onRequestMoveFolder,
  onDelete,
  selectedIds,
  storageType,
  onRename,
  deletingFolderPath,
  isDeletingFolder,
  isSearching = false,
  onFolderFocus,
  focusedFolderPath,
  expandedPaths,
  onExpandedChange,
  onDragStartNode,
  onDragEndNode,
  onDropOnFolder,
  dropTarget,
  rootDropNode,
}) {
  const isOpen =
    node.type === 'folder'
      ? isSearching
        ? true
        : (expandedPaths ? expandedPaths.has(node.path) : false)
      : false;
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(node.name);
  const selectKey = storageType && node.path ? `${storageType}:${node.path}` : node.path;
  const isSelected = selectedIds && selectedIds.has && selectedIds.has(selectKey);
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

  const handleDragStart = (e) => {
    if (isTrashRoot || isUnderDeletingFolder) return;
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DATA_TRANSFER_TYPE, JSON.stringify({ storageType, path: node.path, nodeType: node.type }));
    e.dataTransfer.setData('text/plain', node.name);
    if (onDragStartNode) onDragStartNode(node, storageType);
  };

  const handleDragEnd = () => {
    if (onDragEndNode) onDragEndNode();
  };

  const handleDragOver = (e) => {
    if (!canAcceptDrop) return;
    const dt = e.dataTransfer;
    if (dt.types.includes(DATA_TRANSFER_TYPE) || dt.files?.length > 0 || dt.items?.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      dt.dropEffect = 'move';
      if (onDropOnFolder) onDropOnFolder(effectiveDropTarget, storageType, 'dragOver');
    }
  };

  const handleDrop = async (e) => {
    if (!canAcceptDrop) return;
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt.types.includes(DATA_TRANSFER_TYPE)) {
      try {
        const data = JSON.parse(dt.getData(DATA_TRANSFER_TYPE));
        if (onDropOnFolder) onDropOnFolder(effectiveDropTarget, storageType, 'drop', data);
      } catch (_) {}
    } else if (dt.items?.length > 0 || dt.files?.length > 0) {
      const files = [];
      const dirHandles = [];
      if (dt.items?.length > 0) {
        for (const item of dt.items) {
          if (item.kind === 'file') {
            const handle = item.getAsFileSystemHandle?.();
            if (handle?.kind === 'directory') {
              dirHandles.push(handle);
            } else {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
        }
      } else {
        files.push(...Array.from(dt.files || []));
      }
      if (files.length > 0 || dirHandles.length > 0) {
        if (onDropOnFolder) onDropOnFolder(effectiveDropTarget, storageType, 'drop', { files, dirHandles });
      }
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isUnderDeletingFolder) return;

    const modifiers = { ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey };
    const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey;

    if (node.type === 'folder') {
      if (hasModifier && onSelect) {
        onSelect(storageType, node, modifiers);
      } else {
        if (onExpandedChange && !isSearching) {
          onExpandedChange(storageType, node.path, !isOpen);
        }
        if (onFolderFocus) onFolderFocus(node);
      }
    } else {
      if (onFolderFocus && !node.path.includes('/')) onFolderFocus(null);
      if (onSelect) onSelect(storageType, node, modifiers);
    }
  };

  const handleRenameStart = (e) => {
    e.stopPropagation();
    if (isUnderDeletingFolder) return;
    if (node.type === 'file') {
      setTempName(baseName);
    } else if (node.type === 'folder') {
      setTempName(node.name);
    } else return;
    setIsRenaming(true);
  };

  const commitRename = () => {
    if (isUnderDeletingFolder) {
      setIsRenaming(false);
      return;
    }
    const trimmed = tempName.trim();
    if (!trimmed) {
      setTempName(node.type === 'file' ? baseName : node.name);
      setIsRenaming(false);
      return;
    }
    if (trimmed.includes('/')) {
      alert(node.type === 'folder' ? "폴더 이름에는 '/' 문자를 사용할 수 없습니다." : "파일 이름에는 '/' 문자를 사용할 수 없습니다.");
      setTempName(node.type === 'file' ? baseName : node.name);
      setIsRenaming(false);
      return;
    }

    if (node.type === 'file') {
      if (trimmed === baseName) {
        setIsRenaming(false);
        return;
      }
      if (typeof onRename === 'function') {
        onRename(storageType, node, trimmed);
      }
    } else if (node.type === 'folder') {
      if (trimmed === node.name) {
        setIsRenaming(false);
        return;
      }
      if (typeof onRename === 'function') {
        onRename(storageType, node, trimmed);
      }
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
      setTempName(node.type === 'file' ? baseName : node.name);
      setIsRenaming(false);
    }
  };

  const canDrag = !isTrashRoot && !isUnderDeletingFolder;
  const isRootLevel = level === 0;
  const effectiveDropTarget =
    isRootLevel && rootDropNode && node.type === 'file' ? rootDropNode : node;
  const isDropTarget =
    dropTarget?.storageType === storageType &&
    dropTarget?.folderPath === effectiveDropTarget.path;
  const isUnderDropTarget =
    dropTarget?.storageType === storageType &&
    dropTarget?.folderPath &&
    node.path.startsWith(dropTarget.folderPath);
  const showDropHighlight = !isTrashRoot && (isDropTarget || isUnderDropTarget);
  const canAcceptDrop =
    (node.type === 'folder' || (node.type === 'file' && isRootLevel && rootDropNode)) &&
    !isTrashRoot;

  return (
    <div>
      <div
        data-tree-node-row
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={canAcceptDrop ? handleDragOver : undefined}
        onDrop={canAcceptDrop ? handleDrop : undefined}
        className={`group flex items-center justify-between py-1.5 pr-2 transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700 dark:bg-odp-line dark:text-odp-fgStrong'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-odp-focusBg'
        } ${isUnderDeletingFolder ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${
          isFocusedFolder
            ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-odp-bgSofter'
            : ''
        } ${showDropHighlight ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}
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
          {isRenaming && !isTrashRoot && (node.type === 'file' || node.type === 'folder') ? (
            <span className="flex items-baseline gap-1 min-w-0">
              <input
                className="bg-transparent border-none outline-none text-sm font-medium truncate placeholder:text-gray-400 dark:placeholder:text-gray-500"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                placeholder={node.type === 'file' ? (baseName || '이름 없음') : (node.name || '폴더명')}
              />
              {node.type === 'file' && extension && (
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
          {node.type === 'folder' && !isTrashRoot && onRequestMoveFolder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isUnderDeletingFolder) return;
                onRequestMoveFolder(node, storageType);
              }}
              className="p-1 rounded text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-odp-focusBg"
              title="폴더 위치 이동"
            >
              <ArrowRightToLine size={12} />
            </button>
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
          {node.type === 'folder' && !isTrashRoot && (
            <button
              onClick={handleRenameStart}
              className="p-1 rounded text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-odp-focusBg"
              title="폴더명 수정"
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
            onRequestMoveFolder={onRequestMoveFolder}
            onDelete={onDelete}
            selectedIds={selectedIds}
            storageType={storageType}
            onRename={onRename}
            deletingFolderPath={deletingFolderPath}
            isDeletingFolder={isDeletingFolder}
            isSearching={isSearching}
            expandedPaths={expandedPaths}
            onExpandedChange={onExpandedChange}
            onFolderFocus={onFolderFocus}
            focusedFolderPath={focusedFolderPath}
            onDragStartNode={onDragStartNode}
            onDragEndNode={onDragEndNode}
            onDropOnFolder={onDropOnFolder}
            dropTarget={dropTarget}
            rootDropNode={rootDropNode}
          />
        ))}
    </div>
  );
}

