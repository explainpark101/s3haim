import React, { useEffect, useRef, useState } from 'react';
import {
  IconCloud,
  IconDownload,
  IconFileCode,
  IconFolder,
  IconRefresh,
  IconSave,
  IconTrash,
} from '@/components/icons';
import MarkdownEditor from '@/components/MarkdownEditor';
import Button from '@/components/Button';
import { ConfirmModal } from '@/components/modals/ConfirmModal';

export default function EditorPane({
  currentFile,
  editorContent,
  onChangeEditor,
  onSave,
  isSaving,
  onRequestDelete,
  onRenameTitle,
  onRenameFullName,
  onRequestMove,
  onViewUnsupportedAsText,
  onDownloadCurrentFile,
  theme = 'light',
}) {
  const [title, setTitle] = useState('');
  const [isExtConfirmOpen, setIsExtConfirmOpen] = useState(false);
  const [pdfIframeKey, setPdfIframeKey] = useState(0);
  const pdfIframeRef = useRef(null);

  useEffect(() => {
    if (currentFile) {
      const name = currentFile.name || '';
      const lastDot = name.lastIndexOf('.');
      const base = lastDot > 0 ? name.slice(0, lastDot) : name;
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

  const viewer = currentFile.viewer || 'markdown';
  const hasUnsavedChanges = viewer === 'markdown' && currentFile.content !== editorContent;

  const name = currentFile.name || '';
  const lastDot = name.lastIndexOf('.');
  const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : '';
  const isMarkdownExt = ext === '.md';

  const getTitleVisualLength = (text) => {
    const s = text || '제목 없음';
    let total = 0;
    for (const ch of s) {
      if (/[ \.]/.test(ch)) {
        total += 1;
      } else {
        total += 1.3;
      }
    }
    return total;
  };

  const handleTitleBlur = () => {
    if (!currentFile) return;
    const trimmed = title.trim();
    const originalBase = baseName;

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

  const handleExtensionDoubleClick = () => {
    if (!currentFile) return;
    if (!isMarkdownExt) return;
    setIsExtConfirmOpen(true);
  };

  const handleConfirmExtensionChange = () => {
    if (!currentFile || !isMarkdownExt) {
      setIsExtConfirmOpen(false);
      return;
    }

    const currentExtWithoutDot = ext.slice(1) || 'md';
    const input = window.prompt(
      '새 확장자를 입력하세요. 점(.)은 제외하고 입력합니다.\n예: txt, markdown',
      currentExtWithoutDot,
    );
    if (!input) {
      setIsExtConfirmOpen(false);
      return;
    }

    const cleaned = input.trim().replace(/^\./, '');
    if (!cleaned) {
      setIsExtConfirmOpen(false);
      return;
    }
    if (cleaned.includes('/')) {
      alert("확장자에는 '/' 문자를 사용할 수 없습니다.");
      setIsExtConfirmOpen(false);
      return;
    }

    const newExtWithDot = `.${cleaned}`;
    const baseForRename = (title || baseName).trim();
    if (!baseForRename) {
      alert('파일 이름이 비어 있습니다.');
      setIsExtConfirmOpen(false);
      return;
    }

    const newFullName = `${baseForRename}${newExtWithDot}`;
    if (newFullName === name) {
      setIsExtConfirmOpen(false);
      return;
    }

    if (onRenameFullName) {
      onRenameFullName(newFullName);
    }
    setIsExtConfirmOpen(false);
  };

  const handlePdfRefresh = () => {
    try {
      if (pdfIframeRef.current?.contentWindow) {
        pdfIframeRef.current.contentWindow.location.reload();
      }
    } catch {
      setPdfIframeKey((k) => k + 1);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col min-w-0 max-h-full">
      <div className="h-14 border-b border-gray-200 dark:border-odp-bgSofter bg-white dark:bg-odp-surface flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3 text-gray-700 dark:text-odp-fgStrong font-medium min-w-0">
          {currentFile.type === 's3' ? <IconCloud /> : <IconFolder />}
          <div className="flex items-baseline gap-1 min-w-0">
            <input
              className="bg-transparent border-none outline-none text-sm md:text-base font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-[3em] max-w-[100%]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="제목 없음"
              style={{
                // width: `${Math.max(getTitleVisualLength(title), 12)}ch`,
                // width: 'max-content'
              }}
            />
            {ext && (
              <span
                className={`text-xs text-gray-400 dark:text-gray-500 shrink-0 ${
                  isMarkdownExt ? 'cursor-pointer' : ''
                }`}
                onDoubleClick={isMarkdownExt ? handleExtensionDoubleClick : undefined}
                title={isMarkdownExt ? '확장자를 변경하려면 더블클릭하세요.' : undefined}
              >
                {ext}
              </span>
            )}
          </div>
          {hasUnsavedChanges && <span className="text-red-500 text-xl leading-none">*</span>}
        </div>
        <div className="flex items-center gap-2">
          {viewer === 'pdf' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePdfRefresh}
              title="PDF 뷰어 새로고침"
            >
              <IconRefresh size={14} /> 새로고침
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRequestMove}
          >
            <IconFolder size={14} /> 폴더로 이동
          </Button>
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
            disabled={isSaving || viewer !== 'markdown'}
          >
            <IconSave /> {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden bg-white dark:bg-odp-surface h-full">
        {viewer === 'markdown' ? (
          <MarkdownEditor value={editorContent} onChange={onChangeEditor} theme={theme} />
        ) : viewer === 'image' && currentFile.objectUrl ? (
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <img
              src={currentFile.objectUrl}
              alt={currentFile.name}
              className="max-w-full max-h-full object-contain rounded border border-gray-200 dark:border-odp-borderSoft bg-black/5 dark:bg-black/20"
            />
          </div>
        ) : viewer === 'pdf' && currentFile.objectUrl ? (
          <div className="flex-1 overflow-hidden">
            <iframe
              ref={pdfIframeRef}
              key={pdfIframeKey}
              src={currentFile.objectUrl}
              title={currentFile.name}
              className="w-full h-full border-0 bg-white dark:bg-black"
            />
          </div>
        ) : viewer === 'json' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            <textarea
              readOnly
              value={editorContent}
              className="flex-1 w-full min-h-0 p-3 font-mono text-sm rounded border border-gray-200 dark:border-odp-borderSoft bg-gray-50 dark:bg-odp-bgSoft text-gray-800 dark:text-odp-fg resize-none outline-none"
              spellCheck={false}
            />
          </div>
        ) : viewer === 'audio' && currentFile.objectUrl ? (
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <audio
              src={currentFile.objectUrl}
              controls
              className="w-full max-w-lg"
            />
          </div>
        ) : viewer === 'video' && currentFile.objectUrl ? (
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <video
              src={currentFile.objectUrl}
              controls
              className="max-w-full max-h-full rounded border border-gray-200 dark:border-odp-borderSoft"
            />
          </div>
        ) : viewer === 'raw' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            <textarea
              readOnly
              value={editorContent}
              className="flex-1 w-full min-h-0 p-3 font-mono text-sm rounded border border-gray-200 dark:border-odp-borderSoft bg-gray-50 dark:bg-odp-bgSoft text-gray-800 dark:text-odp-fg resize-none outline-none"
              spellCheck={false}
            />
          </div>
        ) : viewer === 'unsupported' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <p className="text-sm text-gray-500 dark:text-odp-muted">
              이 파일 형식은 에디터에서 미리보기를 지원하지 않습니다.
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onViewUnsupportedAsText}
              >
                <IconFileCode size={16} /> 텍스트 에디터로 보기
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onDownloadCurrentFile}
              >
                <IconDownload size={16} /> 다운로드
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-500 dark:text-odp-muted">
            이 파일 형식은 에디터에서 미리보기를 지원하지 않습니다.
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={isExtConfirmOpen}
        title="확장자 변경"
        message={'확장자를 변경하면 파일 형식이 바뀔 수 있습니다.\n계속하시겠습니까?'}
        confirmLabel="변경"
        cancelLabel="취소"
        onCancel={() => setIsExtConfirmOpen(false)}
        onConfirm={handleConfirmExtensionChange}
      />
    </div>
  );
}

