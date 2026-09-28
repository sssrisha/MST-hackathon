import React from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from './PageHeader.jsx';
import Card from './Card.jsx';
import { Layers, Terminal, Database } from 'lucide-react';

export function Placeholder({ title, description, actions, data }) {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={description}
        actions={actions}
      />

      <Card>
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-lg bg-[#FF4B3E]/10 border border-[#FF4B3E]/25 flex items-center justify-center text-[#FF6B4A] mb-4">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1.5">
            {title}
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            {description || 'This module placeholder is connected to the TenderGuard service architecture.'}
          </p>

          <div className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-md px-3 py-2 flex items-center gap-2 text-xs font-mono text-slate-300 mb-4">
            <Terminal className="w-4 h-4 text-[#FF6B4A] shrink-0" />
            <span className="text-slate-500">Active Route:</span>
            <span className="text-[#FF8A72] font-mono select-all">
              {location.pathname}
            </span>
          </div>

          {data && (
            <div className="w-full text-left mt-4 border-t border-[#1E2A44] pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <Database className="w-3.5 h-3.5 text-[#FF6B4A]" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Service Layer Data Summary:</span>
              </div>
              <pre className="p-3 bg-[#0B1220] border border-[#1E2A44] rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56">
                {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default Placeholder;
