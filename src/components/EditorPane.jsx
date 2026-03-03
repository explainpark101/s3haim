import React, { useEffect, useState } from 'react';
import { IconCloud, IconFolder, IconSave, IconTrash } from '@/components/icons';
import MarkdownEditor from '@/components/MarkdownEditor';
import Button from '@/components/Button';

export default function EditorPane({
  currentFile,
  editorContent,
  onChangeEditor,
  onSave,
  isSaving,
  onRequestDelete,
  onRenameTitle,
  theme = 'light',
}) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (currentFile) {
      const base = currentFile.name.endsWith('.md')
        ? currentFile.name.slice(0, -3)
        : currentFile.name;
      setTitle(base);
    } else {
      setTitle('');
    }
  }, [currentFile]);

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
        <IconFolder />
        <p className="mt-4">사이드바에서 파일을 선택하거나 새 파일을 생성하세요.</p>
      </div>
    );
  }

  const hasUnsavedChanges = currentFile.content !== editorContent;

  const handleTitleBlur = () => {
    if (!currentFile) return;
    const trimmed = title.trim();
    const originalBase = currentFile.name.endsWith('.md')
      ? currentFile.name.slice(0, -3)
      : currentFile.name;

    if (!trimmed) {
      setTitle(originalBase);
      return;
    }

    if (trimmed.includes('/')) {
      alert("제목에는 '/' 문자를 사용할 수 없습니다.");
      setTitle(originalBase);
      return;
    }

    if (trimmed === originalBase) return;
    onRenameTitle(trimmed);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-14 border-b border-gray-200 dark:border-odp-bgSofter bg-white dark:bg-odp-surface flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3 text-gray-700 dark:text-odp-fgStrong font-medium min-w-0">
          {currentFile.type === 's3' ? <IconCloud /> : <IconFolder />}
          <div className="flex items-baseline gap-1 min-w-0">
            <input
              className="bg-transparent border-none outline-none text-sm md:text-base font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="제목 없음"
              style={{
                width: `${Math.max((title || '제목 없음').length, 3)}ch`,
              }}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">.md</span>
          </div>
          {hasUnsavedChanges && <span className="text-red-500 text-xl leading-none">*</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onRequestDelete}
          >
            <IconTrash size={16} /> 삭제
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            <IconSave /> {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden bg-white dark:bg-odp-surface">
        <MarkdownEditor value={editorContent} onChange={onChangeEditor} theme={theme} />
      </div>
    </div>
  );
}

