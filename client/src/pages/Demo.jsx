import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Radio } from 'lucide-react';

export default function Demo() {
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleRefresh = () => {
    setIframeKey(Date.now());
  };

  const handleOpenExternal = () => {
    window.open('/vimal/index.html', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-4' : ''}`}>
      {/* Top Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Demo
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                ADMIN & OPERATOR ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live drone telemetry, traffic signal grid control, and quadrotor simulation demo.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            title="Reload simulation view"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            title="Toggle fullscreen expansion"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Expand'}</span>
          </button>

          <button
            onClick={handleOpenExternal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all"
            title="Open in standalone browser window"
          >
            <span>Open Dedicated Window</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embedded Application Frame */}
      <div
        className="w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative"
        style={{ height: isFullscreen ? 'calc(100vh - 100px)' : 'calc(100vh - 230px)', minHeight: '620px' }}
      >
        <iframe
          key={iframeKey}
          src="/vimal/index.html"
          title="Demo"
          className="w-full h-full border-0"
          allow="geolocation; accelerometer; gyroscope; fullscreen"
        />
      </div>
    </div>
  );
}
