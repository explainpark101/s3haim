import { useRef, useState } from 'react';
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
import MonacoTextEditor from '@/components/MonacoTextEditor';
import Button from '@/components/Button';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { X } from 'lucide-react';

export default function EditorPane({
  currentFile,
  editorContent,
  onChangeEditor,
  onSave,
  isSaving,
  onRequestDelete,
  editedFileName = '',
  setEditedFileName,
  onRenameFullName,
  onRequestSuffixChangeConfirmForBlur,
  onRequestClose,
  onRequestMove,
  onViewUnsupportedAsText,
  onDownloadCurrentFile,
  theme = 'light',
  previewOnly = false,
}) {
  const [pdfIframeKey, setPdfIframeKey] = useState(0);
  const pdfIframeRef = useRef(null);

  const getExt = (fileName) => {
    if (!fileName || typeof fileName !== 'string') return '';
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.slice(lastDot) : '';
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
        <IconFolder />
        <p className="mt-4">사이드바에서 파일을 선택하거나 새 파일을 생성하세요.</p>
      </div>
    );
  }

  const viewer = currentFile.viewer || 'markdown';
  const isEditableViewer = viewer === 'markdown' || viewer === 'json' || viewer === 'raw';
  const hasUnsavedChanges = isEditableViewer && currentFile.content !== editorContent;

  const currentName = currentFile.name || '';

  const handleFileNameBlur = () => {
    if (!currentFile || typeof setEditedFileName !== 'function') return;
    const trimmed = (editedFileName ?? '').trim();
    if (!trimmed) {
      setEditedFileName(currentName);
      return;
    }
    if (trimmed.includes('/')) {
      alert("파일명에는 '/' 문자를 사용할 수 없습니다.");
      setEditedFileName(currentName);
      return;
    }
    if (trimmed === currentName) return;
    if (getExt(trimmed) !== getExt(currentName)) {
      onRequestSuffixChangeConfirmForBlur?.();
      return;
    }
    onRenameFullName?.(trimmed);
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
      <div className="h-14 border-b border-gray-200 dark:border-odp-bgSofter bg-white dark:bg-odp-surface flex items-center justify-between px-6 shrink-0 w-full gap-2">
        <div className="flex items-center gap-3 text-gray-700 dark:text-odp-fgStrong font-medium min-w-0 w-full">
          {currentFile.type === 's3' ? <IconCloud /> : <IconFolder />}
          <div className="flex items-baseline min-w-0 flex-1 gap-1">
            {hasUnsavedChanges && <span className="text-red-500 text-xl leading-none shrink-0">*</span>}
            <input
              className="bg-transparent border-none outline-none text-sm md:text-base font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-[3em] w-full"
              value={editedFileName ?? ''}
              onChange={(e) => setEditedFileName?.(e.target.value)}
              onBlur={handleFileNameBlur}
              placeholder="파일명"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end shrink-0">
          {viewer === 'pdf' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePdfRefresh}
              title="PDF 뷰어 새로고침"
            >
              <IconRefresh size={14} />
              <span className="hidden md:inline"> 새로고침</span>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRequestMove}
            title="폴더로 이동"
          >
            <IconFolder size={14} />
            <span className="hidden md:inline"> 폴더로 이동</span>
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onRequestDelete}
            title="삭제"
          >
            <IconTrash size={16} />
            <span className="hidden md:inline"> 삭제</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isEditableViewer}
            title={isSaving ? '저장 중...' : '저장'}
          >
            <IconSave />
            <span className="hidden md:inline"> {isSaving ? '저장 중...' : '저장'}</span>
          </Button>
          {!previewOnly && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={() => onRequestClose?.()}
              title="닫기"
              aria-label="파일 닫기"
            >
              <X size={16} />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden bg-white dark:bg-odp-surface h-full">
        {viewer === 'markdown' ? (
          <MarkdownEditor
            value={editorContent}
            onChange={onChangeEditor}
            onSave={onSave}
            theme={theme}
            previewOnly={previewOnly}
          />
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
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4">
            <MonacoTextEditor
              value={editorContent}
              language="json"
              theme={theme}
              readOnly={false}
              onChange={onChangeEditor}
              onSave={onSave}
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
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4">
            <MonacoTextEditor
              value={editorContent}
              language="plaintext"
              theme={theme}
              readOnly={false}
              onChange={onChangeEditor}
              onSave={onSave}
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
    </div>
  );
}

