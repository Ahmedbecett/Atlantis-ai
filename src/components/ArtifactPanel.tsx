import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Code2,
  Eye,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  Check,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { Artifact } from '../types';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (artifact && ['html', 'javascript', 'svg', 'react'].includes(artifact.type)) {
      setActiveTab('preview');
    } else {
      setActiveTab('code');
    }
  }, [artifact]);

  if (!artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let ext = 'html';
    if (artifact.type === 'python') ext = 'py';
    else if (artifact.type === 'javascript') ext = 'js';
    else if (artifact.type === 'react') ext = 'tsx';
    else if (artifact.type === 'svg') ext = 'svg';
    else if (artifact.type === 'css') ext = 'css';

    const blob = new Blob([artifact.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlantis-artifact-${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRunnableHtml = () => {
    if (artifact.type === 'svg') {
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0b132b; }
    svg { max-width: 90vw; max-height: 90vh; }
  </style>
</head>
<body>
  ${artifact.code}
</body>
</html>`;
    }

    if (artifact.code.includes('<html') || artifact.code.includes('<!DOCTYPE')) {
      return artifact.code;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atlantis Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; }
  </style>
</head>
<body class="p-4">
  ${artifact.code}
</body>
</html>`;
  };

  return (
    <div
      className={`fixed z-40 transition-all duration-300 flex flex-col bg-[#060c18] border-l border-cyan-950/80 shadow-2xl ${
        isFullscreen ? 'inset-0' : 'top-0 right-0 bottom-0 w-full sm:w-[540px] lg:w-[620px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a1224] border-b border-cyan-900/40">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="text-sm font-bold text-slate-100 truncate">{artifact.title}</h3>
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
              {artifact.language} • Atlantis Live Sandbox
            </span>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex p-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                activeTab === 'preview'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                activeTab === 'code'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            title="Download file"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Minimize' : 'Maximize'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-hidden relative bg-[#040813]">
        {activeTab === 'preview' ? (
          <div className="w-full h-full relative">
            <iframe
              ref={iframeRef}
              title="Atlantis Interactive Artifact"
              srcDoc={getRunnableHtml()}
              sandbox="allow-scripts allow-forms allow-modals"
              className="w-full h-full border-0 bg-slate-950"
            />
            {/* Quick reload overlay pill */}
            <button
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.srcdoc = getRunnableHtml();
                }
              }}
              className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-cyan-300 border border-cyan-800/50 shadow-lg text-xs hover:bg-slate-800 transition-all"
            >
              <RotateCw className="w-3 h-3" />
              <span>Refresh Sandbox</span>
            </button>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto p-4 font-mono text-xs md:text-sm text-cyan-100 bg-[#070d1c]">
            <pre className="whitespace-pre-wrap">{artifact.code}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
