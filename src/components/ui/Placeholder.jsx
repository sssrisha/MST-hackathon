import React from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from './PageHeader.jsx';
import Card from './Card.jsx';
import { Layers, Terminal } from 'lucide-react';

export function Placeholder({ title, description, actions }) {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={description}
        actions={actions}
      />

      <Card>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-lg bg-[#1E2A44]/70 border border-[#2E3C5C] flex items-center justify-center text-blue-400 mb-4">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-white mb-1.5">
            {title} Module
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            {description || 'This module placeholder is wired to the OpenTender routing architecture.'}
          </p>

          <div className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-md px-3 py-2 flex items-center gap-2 text-xs font-mono text-slate-300">
            <Terminal className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-500">Active Route:</span>
            <span className="text-blue-300 font-mono select-all">
              {location.pathname}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Placeholder;
