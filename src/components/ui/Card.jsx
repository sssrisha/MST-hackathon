import React from 'react';
import clsx from 'clsx';

export function Card({ children, className = '', header, footer, ...props }) {
  return (
    <div
      className={clsx(
        'tg-card bg-[#111A2E] border border-[#1E2A44] rounded-lg shadow-sm',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-[#1E2A44] flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-3.5 border-t border-[#1E2A44] bg-[#0E1626] rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
