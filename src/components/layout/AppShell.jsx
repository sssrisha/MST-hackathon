import React from 'react';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';

export function AppShell({ children }) {
  return (
    <div className="tg-internal min-h-screen bg-[#0B1220] text-slate-100 flex flex-col font-sans">
      <Topbar />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
