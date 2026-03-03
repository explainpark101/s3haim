import { useEffect, useState } from 'react';

const ANIMATION_DURATION_MS = 200;

export default function Modal({ isOpen, children }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setVisible(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    if (mounted) {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), ANIMATION_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${
        visible ? 'opacity-100 bg-black/40' : 'opacity-0 bg-black/0'
      }`}
      aria-hidden={!visible}
    >
      <div
        className={`bg-white dark:bg-odp-surface text-gray-800 dark:text-odp-fgStrong rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

