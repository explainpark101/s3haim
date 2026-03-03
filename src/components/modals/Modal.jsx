import React, { useEffect, useState } from 'react';

export default function Modal({ isOpen, children }) {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // 다음 프레임에서 fade-in
      requestAnimationFrame(() => setVisible(true));
    } else if (mounted) {
      // fade-out 후 언마운트
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? 'opacity-100 bg-black/40' : 'opacity-0 bg-black/0'
      }`}
    >
      <div
        className={`bg-white dark:bg-odp-surface text-gray-800 dark:text-odp-fgStrong rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-200 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

