import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Printer } from 'lucide-react';

export default function ExportPDF({
  value = '',
  theme = 'light',
  disabled,
  trigger,
}) {
  const navigate = useNavigate();

  const open = useCallback(() => {
    if (disabled) return;
    navigate('/export-pdf', { state: { value, theme } });
  }, [navigate, value, theme, disabled]);

  return (
    <button
      type="button"
      className="md-editor-toolbar-item"
      onClick={open}
      disabled={disabled}
      title="PDF로 내보내기"
      aria-label="PDF로 내보내기"
    >
      {trigger ?? <Printer className="md-editor-icon" size={16} />}
    </button>
  );
}
