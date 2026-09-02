import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared page-level container used by both the user Dashboard and the
 * Admin panel so their content areas share the same width, padding, and
 * spacing rhythm.
 */
export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`max-w-screen-2xl w-full mx-auto px-6 py-8 space-y-8 ${className}`.trim()}>
      {children}
    </div>
  );
};
