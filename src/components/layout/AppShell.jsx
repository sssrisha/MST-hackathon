import React from 'react';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 flex flex-col font-sans">
      <Topbar />

      <div className="flex-1 flex">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
