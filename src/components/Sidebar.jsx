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
}) {
  return (
    <div className="w-64 bg-white dark:bg-odp-bgSoft border-r border-gray-200 dark:border-odp-bgSofter flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-odp-bgSofter flex justify-between items-center bg-gray-50 dark:bg-odp-surface">
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

      <div className="flex-1 overflow-y-auto pb-4 space-y-6">
        {/* S3 Section */}
        <div>
          <div className="sticky top-0 bg-white dark:bg-odp-bgSoft px-3 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 z-10 border-b border-gray-100 dark:border-odp-surface">
            <span className="flex items-center gap-1">
              <IconCloud /> S3 Storage
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onCreateItem('s3', '', null, 'file')}
                className="hover:text-blue-500"
                title="루트 파일 생성"
              >
                <IconFilePlus />
              </button>
              <button
                onClick={() => onCreateItem('s3', '', null, 'folder')}
                className="hover:text-blue-500"
                title="루트 폴더 생성"
              >
                <IconFolderPlus />
              </button>
            </div>
          </div>
          {s3Bucket ? (
            <div className="space-y-0.5">
              {s3Tree.length > 0 ? (
                s3Tree.map((node) => (
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
                  onClick={() => onCreateItem('local', '', localRootHandle, 'file')}
                  className="hover:text-blue-500"
                  title="루트 파일 생성"
                >
                  <IconFilePlus />
                </button>
                <button
                  onClick={() => onCreateItem('local', '', localRootHandle, 'folder')}
                  className="hover:text-blue-500"
                  title="루트 폴더 생성"
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
            {localTree.map((node) => (
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

