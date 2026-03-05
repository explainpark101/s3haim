import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import TreeNode from '@/components/TreeNode';
import { findNodeByPath } from '@/utils/s3Tree';

const EXPANDED_FOLDERS_KEY = 's3haim_expandedFolders';

function loadExpandedPaths() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(EXPANDED_FOLDERS_KEY) : null;
    if (!raw) return { s3: new Set(), local: new Set() };
    const data = JSON.parse(raw);
    return {
      s3: new Set(Array.isArray(data.s3) ? data.s3 : []),
      local: new Set(Array.isArray(data.local) ? data.local : []),
    };
  } catch {
    return { s3: new Set(), local: new Set() };
  }
}

function saveExpandedPaths(expanded) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      EXPANDED_FOLDERS_KEY,
      JSON.stringify({
        s3: Array.from(expanded.s3),
        local: Array.from(expanded.local),
      }),
    );
  } catch (_) {}
}
import {
  IconCloud,
  IconFilePlus,
  IconFolder,
  IconFolderPlus,
  IconSettings,
  IconSun,
  IconMoon,
  IconUpload,
} from '@/components/icons';
import { ArrowRightToLine } from 'lucide-react';

const DATA_TRANSFER_TYPE = 'application/x-s3haim-tree-node';

function RootDropZone({ storageType, localRootHandle, onDropOnFolder, dropTarget }) {
  const rootNode = {
    path: '',
    type: 'folder',
    name: 'root',
    handle: storageType === 'local' ? localRootHandle : null,
  };
  const isDropTarget = dropTarget?.storageType === storageType && dropTarget?.folderPath === '';

  const handleDragOver = (e) => {
    const dt = e.dataTransfer;
    if (dt.types.includes(DATA_TRANSFER_TYPE) || dt.files?.length > 0 || dt.items?.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      dt.dropEffect = 'move';
      if (onDropOnFolder) onDropOnFolder(rootNode, storageType, 'dragOver');
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt.types.includes(DATA_TRANSFER_TYPE)) {
      try {
        const data = JSON.parse(dt.getData(DATA_TRANSFER_TYPE));
        if (onDropOnFolder) onDropOnFolder(rootNode, storageType, 'drop', data);
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
        if (onDropOnFolder) onDropOnFolder(rootNode, storageType, 'drop', { files, dirHandles });
      }
    }
  };

  const canDrop = storageType === 's3' || (storageType === 'local' && localRootHandle);

  if (!canDrop) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex items-center gap-1.5 py-1.5 pr-2 px-2 transition-colors text-sm cursor-default ${
        isDropTarget
          ? 'bg-blue-100 dark:bg-blue-900/40 rounded'
          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-odp-focusBg rounded'
      }`}
      style={{ paddingLeft: '8px' }}
    >
      <span className="text-gray-400 dark:text-gray-500 w-4 flex justify-center shrink-0">
        <IconFolder size={14} />
      </span>
      <span className="text-gray-500 dark:text-gray-400 truncate">
        {storageType === 's3' ? '루트 (버킷 최상위)' : '루트 폴더'}
      </span>
    </div>
  );
}

export default function Sidebar({
  s3Tree,
  s3Bucket,
  localTree,
  localRootHandle,
  currentFile,
  selectedIds,
  onSelectFile,
  onClearSelection,
  onCreateItem,
  onRequestUploadFile,
  onRequestUploadFolder,
  onRequestMoveFolder,
  onOpenLocalFolder,
  onSetDeleteTarget,
  onOpenSettings,
  theme,
  onToggleTheme,
  onRenameItem,
  showHiddenFolders,
  deletingFolderPath,
  isDeletingFolder,
  onDropOnFolder,
  onDragEndNode,
  dropTarget,
  expandPathsRef,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastFocusedS3FolderPath, setLastFocusedS3FolderPath] = useState('');
  const [lastFocusedLocalFolder, setLastFocusedLocalFolder] = useState({
    path: '',
    handle: null,
  });
  const [expandedPaths, setExpandedPaths] = useState(loadExpandedPaths);
  const scrollContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const autoScrollIntervalRef = useRef(null);
  const EDGE_THRESHOLD = 48;
  const AUTO_SCROLL_SPEED = 12;

  const handleDragStartNode = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragEndNode = useCallback(() => {
    isDraggingRef.current = false;
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    onDragEndNode?.();
  }, [onDragEndNode]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!isDraggingRef.current) return;
      const rect = el.getBoundingClientRect();
      const isOver =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (isOver) {
        el.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', onWheel, { passive: false });
    return () => document.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onDragEnd = () => {
      isDraggingRef.current = false;
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
    document.addEventListener('dragend', onDragEnd);
    document.addEventListener('drop', onDragEnd);
    return () => {
      document.removeEventListener('dragend', onDragEnd);
      document.removeEventListener('drop', onDragEnd);
    };
  }, []);

  const handleScrollAreaDragEnter = useCallback((e) => {
    const hasDragData =
      e.dataTransfer?.types?.includes(DATA_TRANSFER_TYPE) ||
      e.dataTransfer?.types?.includes?.('Files');
    if (hasDragData) isDraggingRef.current = true;
  }, []);

  const handleScrollAreaDragOver = useCallback((e) => {
    const el = scrollContainerRef.current;
    const hasDragData =
      e.dataTransfer?.types?.includes(DATA_TRANSFER_TYPE) ||
      (e.dataTransfer?.types?.includes?.('Files') && e.dataTransfer?.items?.length > 0);
    if (!el || !hasDragData) return;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const threshold = EDGE_THRESHOLD;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    const stopAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };

    if (y < threshold) {
      if (!autoScrollIntervalRef.current) {
        autoScrollIntervalRef.current = setInterval(() => {
          if (el) {
            el.scrollTop = Math.max(0, el.scrollTop - AUTO_SCROLL_SPEED);
          } else {
            stopAutoScroll();
          }
        }, 16);
      }
    } else if (y > rect.height - threshold) {
      if (!autoScrollIntervalRef.current) {
        autoScrollIntervalRef.current = setInterval(() => {
          if (el) {
            el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + AUTO_SCROLL_SPEED);
          } else {
            stopAutoScroll();
          }
        }, 16);
      }
    } else {
      stopAutoScroll();
    }
  }, []);

  const handleExpandedChange = useCallback((storageType, path, isOpen) => {
    setExpandedPaths((prev) => {
      const next = {
        s3: new Set(prev.s3),
        local: new Set(prev.local),
      };
      const set = storageType === 's3' ? next.s3 : next.local;
      if (isOpen) set.add(path);
      else set.delete(path);
      saveExpandedPaths(next);
      return next;
    });
  }, []);

  const expandPathsForNewItem = useCallback((storageType, paths) => {
    if (!paths?.length) return;
    setExpandedPaths((prev) => {
      const next = {
        s3: new Set(prev.s3),
        local: new Set(prev.local),
      };
      const set = storageType === 's3' ? next.s3 : next.local;
      paths.forEach((p) => set.add(p));
      saveExpandedPaths(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (expandPathsRef) {
      expandPathsRef.current = expandPathsForNewItem;
      return () => {
        expandPathsRef.current = null;
      };
    }
  }, [expandPathsRef, expandPathsForNewItem]);

  const filterTree = (nodes, { hideDotFolders } = {}) => {
    if (!searchTerm) return nodes;
    const q = searchTerm.toLowerCase();

    const walk = (node) => {
      if (hideDotFolders && node.type === 'folder' && node.name.startsWith('.')) {
        return null;
      }
      const nameMatch =
        node.name.toLowerCase().includes(q) || (node.path && node.path.toLowerCase().includes(q));
      if (node.type === 'folder' && node.children) {
        const children = node.children
          .map(walk)
          .filter(Boolean);
        if (children.length || nameMatch) {
          return { ...node, children };
        }
        return null;
      }
      return nameMatch ? node : null;
    };

    return nodes
      .map(walk)
      .filter(Boolean);
  };

  const filteredS3Tree = useMemo(
    () => filterTree(s3Tree, { hideDotFolders: !showHiddenFolders }),
    [s3Tree, searchTerm, showHiddenFolders],
  );
  const filteredLocalTree = useMemo(
    () => filterTree(localTree, { hideDotFolders: false }),
    [localTree, searchTerm],
  );

  const collectFolderPaths = (nodes) => {
    const paths = new Set();
    const walk = (n) => {
      if (n.type === 'folder' && n.path) {
        paths.add(n.path);
        if (n.children) n.children.forEach(walk);
      }
    };
    nodes.forEach(walk);
    return paths;
  };
  const effectiveExpandedS3 = useMemo(
    () => (searchTerm ? collectFolderPaths(filteredS3Tree) : expandedPaths.s3),
    [searchTerm, filteredS3Tree, expandedPaths.s3],
  );
  const effectiveExpandedLocal = useMemo(
    () => (searchTerm ? collectFolderPaths(filteredLocalTree) : expandedPaths.local),
    [searchTerm, filteredLocalTree, expandedPaths.local],
  );

  const selectedFolderForMove = useMemo(() => {
    if (!selectedIds?.size) return null;
    for (const key of selectedIds) {
      const colonIdx = key.indexOf(':');
      const storageType = colonIdx >= 0 ? key.slice(0, colonIdx) : 's3';
      const path = colonIdx >= 0 ? key.slice(colonIdx + 1) : key;
      const tree = storageType === 's3' ? s3Tree : localTree;
      const node = findNodeByPath(tree, path);
      if (node?.type === 'folder' && path !== '.trash/') {
        return { node, storageType };
      }
    }
    return null;
  }, [selectedIds, s3Tree, localTree]);

  return (
    <div className="w-full h-full min-h-0 bg-white dark:bg-odp-bgSoft border-r border-gray-200 dark:border-odp-bgSofter flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-odp-bgSofter flex flex-col gap-3 bg-gray-50 dark:bg-odp-surface shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="font-bold text-lg text-gray-700 dark:text-odp-fgStrong">S3 Haim</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleTheme}
              className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
              title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {theme !== 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
            >
              <IconSettings />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-white dark:bg-odp-bgSoft border border-gray-200 dark:border-odp-borderSoft px-2 py-1.5 text-xs text-gray-500 dark:text-odp-fg">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="파일명 검색 (S3/Local)"
            className="w-full bg-transparent border-none outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        {selectedFolderForMove && onRequestMoveFolder && (
          <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2 py-1.5 text-xs">
            <span className="text-blue-700 dark:text-blue-300 truncate flex-1 min-w-0">
              폴더 선택됨: {selectedFolderForMove.node.name}
            </span>
            <button
              type="button"
              onClick={() => onRequestMoveFolder(selectedFolderForMove.node, selectedFolderForMove.storageType)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shrink-0"
              title="폴더 이동"
            >
              <ArrowRightToLine size={12} />
              이동
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4 space-y-6"
        onDragEnter={handleScrollAreaDragEnter}
        onDragOver={handleScrollAreaDragOver}
        onClick={(e) => {
          if (
            !e.target.closest('[data-tree-node-row]') &&
            !e.target.closest('button') &&
            !e.target.closest('input')
          ) {
            setLastFocusedS3FolderPath('');
            setLastFocusedLocalFolder({ path: '', handle: null });
            onClearSelection?.();
          }
        }}
        role="presentation"
      >
        {/* S3 Section */}
        <div>
          <div className="sticky top-0 bg-white dark:bg-odp-bgSoft px-3 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 z-10 border-b border-gray-100 dark:border-odp-surface">
            <span className="flex items-center gap-1">
              <IconCloud /> S3 Storage
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const targetPath = lastFocusedS3FolderPath || '';
                  onRequestUploadFile?.('s3', targetPath, null);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                title="선택된 폴더에 파일 업로드 (여러 개 선택 가능)"
              >
                <IconUpload size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
              </button>
              <button
                onClick={() => {
                  const targetPath = lastFocusedS3FolderPath || '';
                  onRequestUploadFolder?.('s3', targetPath, null);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                title="선택된 폴더에 폴더 업로드 (폴더 전체)"
              >
                <IconFolder size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
              </button>
              <button
                onClick={() => {
                  const targetPath = lastFocusedS3FolderPath || '';
                  onCreateItem('s3', targetPath, null, 'file');
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                title="선택된 폴더에 파일 생성"
              >
                <IconFilePlus size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
              </button>
              <button
                onClick={() => {
                  const targetPath = lastFocusedS3FolderPath || '';
                  onCreateItem('s3', targetPath, null, 'folder');
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                title="선택된 폴더에 폴더 생성"
              >
                <IconFolderPlus size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
              </button>
            </div>
          </div>
          {s3Bucket ? (
            <div className="space-y-0.5">
              <RootDropZone
                storageType="s3"
                localRootHandle={null}
                onDropOnFolder={onDropOnFolder}
                dropTarget={dropTarget}
              />
              {filteredS3Tree.length > 0 ? (
                filteredS3Tree.map((node) => (
                  <TreeNode
                    key={node.path}
                    node={node}
                    level={0}
                    rootDropNode={{ path: '', type: 'folder', handle: null }}
                    onSelect={onSelectFile}
                    storageType="s3"
                    selectedIds={selectedIds}
                    onCreateFile={(p) => onCreateItem('s3', p, null, 'file')}
                    onCreateFolder={(p) => onCreateItem('s3', p, null, 'folder')}
                    onRequestMoveFolder={onRequestMoveFolder}
                    onDelete={(n, t) => onSetDeleteTarget({ node: n, type: t })}
                    onRename={onRenameItem}
                    deletingFolderPath={deletingFolderPath}
                    isDeletingFolder={isDeletingFolder}
                    isSearching={!!searchTerm}
                    expandedPaths={effectiveExpandedS3}
                    onExpandedChange={handleExpandedChange}
                    onFolderFocus={(node) =>
                      setLastFocusedS3FolderPath(node ? node.path || '' : '')
                    }
                    focusedFolderPath={lastFocusedS3FolderPath}
                    onDropOnFolder={onDropOnFolder}
                    onDragStartNode={handleDragStartNode}
                    onDragEndNode={handleDragEndNode}
                    dropTarget={dropTarget}
                  />
                ))
              ) : (
                <p className="text-xs text-gray-400 px-4 py-2">파일이 없습니다.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 px-4 py-2">설정에서 연동하세요.</p>
          )}
        </div>

        {/* Local Section */}
        <div>
          <div className="sticky top-0 bg-white dark:bg-odp-bgSoft px-3 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 z-10 border-b border-gray-100 dark:border-odp-surface">
            <span className="flex items-center gap-1">
              <IconFolder /> Local Folder
            </span>
            {localRootHandle && (
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const target =
                      lastFocusedLocalFolder.path && lastFocusedLocalFolder.handle
                        ? lastFocusedLocalFolder
                        : { path: '', handle: localRootHandle };
                    onRequestUploadFile?.('local', target.path, target.handle);
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                  title="선택된 폴더에 파일 업로드 (여러 개 선택 가능)"
                >
                  <IconUpload size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
                </button>
                <button
                  onClick={() => {
                    const target =
                      lastFocusedLocalFolder.path && lastFocusedLocalFolder.handle
                        ? lastFocusedLocalFolder
                        : { path: '', handle: localRootHandle };
                    onRequestUploadFolder?.('local', target.path, target.handle);
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                  title="선택된 폴더에 폴더 업로드 (폴더 전체)"
                >
                  <IconFolder size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
                </button>
                <button
                  onClick={() => {
                    const target =
                      lastFocusedLocalFolder.path && lastFocusedLocalFolder.handle
                        ? lastFocusedLocalFolder
                        : { path: '', handle: localRootHandle };
                    onCreateItem('local', target.path, target.handle, 'file');
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                  title="선택된 폴더에 파일 생성"
                >
                  <IconFilePlus size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
                </button>
                <button
                  onClick={() => {
                    const target =
                      lastFocusedLocalFolder.path && lastFocusedLocalFolder.handle
                        ? lastFocusedLocalFolder
                        : { path: '', handle: localRootHandle };
                    onCreateItem('local', target.path, target.handle, 'folder');
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 md:min-w-0 md:min-h-0 md:p-1 hover:text-blue-500 touch-manipulation"
                  title="선택된 폴더에 폴더 생성"
                >
                  <IconFolderPlus size={22} className="shrink-0 w-5 h-5 md:w-[14px] md:h-[14px]" />
                </button>
              </div>
            )}
          </div>
          {!localRootHandle && (
            <div className="px-3 mb-2">
              <button
                onClick={onOpenLocalFolder}
                className="w-full bg-white dark:bg-odp-surface border border-gray-300 dark:border-odp-borderStrong text-gray-700 dark:text-odp-fgStrong text-sm py-1.5 px-3 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-odp-focusBg transition flex items-center justify-center gap-2"
              >
                <IconFolder /> 폴더 선택
              </button>
            </div>
          )}
          <div className="space-y-0.5">
            <RootDropZone
              storageType="local"
              localRootHandle={localRootHandle}
              onDropOnFolder={onDropOnFolder}
              dropTarget={dropTarget}
            />
            {filteredLocalTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                level={0}
                rootDropNode={
                  localRootHandle
                    ? { path: '', type: 'folder', handle: localRootHandle }
                    : null
                }
                onSelect={onSelectFile}
                storageType="local"
                selectedIds={selectedIds}
                onCreateFile={(p, h) => onCreateItem('local', p, h, 'file')}
                onCreateFolder={(p, h) => onCreateItem('local', p, h, 'folder')}
                onRequestMoveFolder={onRequestMoveFolder}
                onDelete={(n, t) => onSetDeleteTarget({ node: n, type: t })}
                onRename={onRenameItem}
                deletingFolderPath={deletingFolderPath}
                isDeletingFolder={isDeletingFolder}
                isSearching={!!searchTerm}
                expandedPaths={effectiveExpandedLocal}
                onExpandedChange={handleExpandedChange}
                onFolderFocus={(node) =>
                  setLastFocusedLocalFolder(
                    node
                      ? { path: node.path || '', handle: node.handle }
                      : { path: '', handle: null },
                  )
                }
                focusedFolderPath={lastFocusedLocalFolder.path}
                onDropOnFolder={onDropOnFolder}
                onDragStartNode={handleDragStartNode}
                onDragEndNode={handleDragEndNode}
                dropTarget={dropTarget}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

