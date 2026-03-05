import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MdPreview } from 'md-editor-rt';
import '@/styles/md-editor-rt/style.css';
import { ArrowLeft } from 'lucide-react';

const EDITOR_ID = 'export-pdf-preview';

const headingId = ({ index }) => `pdf-ex-heading-${index}`;

export default function ExportPDFPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { value = '' } = location.state ?? {};

  useEffect(() => {
    if (location.state == null) {
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleExport = useCallback(() => {
    const target = document.querySelector(`#${EDITOR_ID}`);
    if (!target) return;
    window.print();
  }, []);

  if (location.state == null) {
    return null;
  }

  return (
    <div className="export-pdf-page flex flex-col min-h-full bg-white dark:bg-white print:bg-white min-w-0">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-odp-borderSoft shrink-0 print:hidden">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-odp-fg hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-odp-focusBg px-3 py-2 rounded transition"
          aria-label="뒤로 가기"
        >
          <ArrowLeft size={18} />
          뒤로 가기
        </button>
        <h2 className="font-semibold text-gray-800 dark:text-odp-fg truncate flex-1 text-center">
          PDF로 내보내기
        </h2>
        <button
          type="button"
          className="md-editor-btn"
          onClick={handleExport}
        >
          내보내기
        </button>
      </div>

      <MdPreview
        id={EDITOR_ID}
        theme='light'
        language="ko-KR"
        value={value}
        mdHeadingId={headingId}
        codeFoldable={false}
        showCodeRowNumber={false}
      />
    </div>
  );
}
