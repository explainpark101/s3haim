import { useMemo, useState } from 'react';
import TreeNode from '@/components/TreeNode';
import {
  IconCloud,
  IconFilePlus,
  IconFolder,
  IconFolderPlus,
  IconSettings,
  IconSun,
  IconMoon,
} from '@/components/icons';

export default function Sidebar({
  s3Tree,
  s3Bucket,
  localTree,
  localRootHandle,
  currentFile,
  onSelectFile,
  onCreateItem,
  onOpenLocalFolder,
  onSetDeleteTarget,
  onOpenSettings,
  theme,
  onToggleTheme,
  onRenameItem,
  showHiddenFolders,
  deletingFolderPath,
  isDeletingFolder,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastFocusedS3FolderPath, setLastFocusedS3FolderPath] = useState('');
  const [lastFocusedLocalFolder, setLastFocusedLocalFolder] = useState({
    path: '',
    handle: null,
  });

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
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4 space-y-6"
        onClick={(e) => {
          if (
            !e.target.closest('[data-tree-node-row]') &&
            !e.target.closest('button') &&
            !e.target.closest('input')
          ) {
            setLastFocusedS3FolderPath('');
            setLastFocusedLocalFolder({ path: '', handle: null });
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
                  onCreateItem('s3', targetPath, null, 'file');
                }}
                className="hover:text-blue-500"
                title="선택된 폴더에 파일 생성"
              >
                <IconFilePlus />
              </button>
              <button
                onClick={() => {
                  const targetPath = lastFocusedS3FolderPath || '';
                  onCreateItem('s3', targetPath, null, 'folder');
                }}
                className="hover:text-blue-500"
                title="선택된 폴더에 폴더 생성"
              >
                <IconFolderPlus />
              </button>
            </div>
          </div>
          {s3Bucket ? (
            <div className="space-y-0.5">
              {filteredS3Tree.length > 0 ? (
                filteredS3Tree.map((node) => (
                  <TreeNode
                    key={node.path}
                    node={node}
                    level={0}
                    onSelect={onSelectFile}
                    storageType="s3"
                    currentFileId={currentFile?.id}
                    onCreateFile={(p) => onCreateItem('s3', p, null, 'file')}
                    onCreateFolder={(p) => onCreateItem('s3', p, null, 'folder')}
                    onDelete={(n, t) => onSetDeleteTarget({ node: n, type: t })}
                    onRename={onRenameItem}
                    deletingFolderPath={deletingFolderPath}
                    isDeletingFolder={isDeletingFolder}
                    isSearching={!!searchTerm}
                    onFolderFocus={(node) =>
                      setLastFocusedS3FolderPath(node ? node.path || '' : '')
                    }
                    focusedFolderPath={lastFocusedS3FolderPath}
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
                    onCreateItem('local', target.path, target.handle, 'file');
                  }}
                  className="hover:text-blue-500"
                  title="선택된 폴더에 파일 생성"
                >
                  <IconFilePlus />
                </button>
                <button
                  onClick={() => {
                    const target =
                      lastFocusedLocalFolder.path && lastFocusedLocalFolder.handle
                        ? lastFocusedLocalFolder
                        : { path: '', handle: localRootHandle };
                    onCreateItem('local', target.path, target.handle, 'folder');
                  }}
                  className="hover:text-blue-500"
                  title="선택된 폴더에 폴더 생성"
                >
                  <IconFolderPlus />
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
            {filteredLocalTree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                level={0}
                onSelect={onSelectFile}
                storageType="local"
                currentFileId={currentFile?.id}
                onCreateFile={(p, h) => onCreateItem('local', p, h, 'file')}
                onCreateFolder={(p, h) => onCreateItem('local', p, h, 'folder')}
                onDelete={(n, t) => onSetDeleteTarget({ node: n, type: t })}
                onRename={onRenameItem}
                deletingFolderPath={deletingFolderPath}
                isDeletingFolder={isDeletingFolder}
                isSearching={!!searchTerm}
                onFolderFocus={(node) =>
                  setLastFocusedLocalFolder(
                    node
                      ? { path: node.path || '', handle: node.handle }
                      : { path: '', handle: null },
                  )
                }
                focusedFolderPath={lastFocusedLocalFolder.path}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

