import { useEffect, useRef } from 'react';
import { MdEditor, config } from 'md-editor-rt';
// import 'md-editor-rt/lib/style.css';
import "@/styles/md-editor-rt/style.css";
import KO_KR from '@vavt/cm-extension/dist/locale/ko-KR';

config({
  editorConfig: {
    languageUserDefined: {
      'ko-KR': KO_KR,
    },
  },
});


export default function MarkdownEditor({ value, onChange, onSave, theme = 'light', previewOnly = false }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!previewOnly) return;
    const api = editorRef.current?.value ?? editorRef.current;
    api?.togglePreviewOnly?.(true);
  }, [previewOnly]);

  useEffect(() => {
    if (previewOnly) return;
    const registerPasteHandler = () => {
      const api = editorRef.current?.value ?? editorRef.current;
      if (!api?.domEventHandlers) return false;
      api.domEventHandlers({
        paste: (e, view) => {
          const text = e.clipboardData?.getData('text/plain') ?? '';
          if (text && view) {
            e.preventDefault();
            view.dispatch(view.state.replaceSelection(text));
            return false;
          }
        },
      });
      return true;
    };
    if (!registerPasteHandler()) {
      const id = setTimeout(registerPasteHandler, 100);
      return () => clearTimeout(id);
    }
  }, [previewOnly]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof onSave !== 'function') return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    el.addEventListener('keydown', handleKeyDown, true);
    return () => el.removeEventListener('keydown', handleKeyDown, true);
  }, [onSave]);

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col">
      <MdEditor
        ref={editorRef}
        modelValue={value}
        onChange={onChange}
        className="h-full! max-h-dvh"
        theme={theme}
        language="ko-KR"
        previewOnly={previewOnly}
        autoDetectCode={true}
      />
    </div>
  );
}

