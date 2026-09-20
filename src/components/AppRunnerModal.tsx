import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCcw,
  User,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AppBuild } from '../types';

interface AppRunnerModalProps {
  app: AppBuild | null;
  isOpen: boolean;
  onClose: () => void;
  onRemix: (app: AppBuild) => void;
  onRemove?: (appId: string) => void;
  canRemove?: boolean;
}

export const AppRunnerModal: React.FC<AppRunnerModalProps> = ({
  app,
  isOpen,
  onClose,
  onRemix,
  onRemove,
  canRemove,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);

  if (!isOpen || !app) return null;

  const handleOpenWindow = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(app.code);
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`bg-[#202020] border border-[#383838] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-150 ${
          isFullscreen ? 'w-full h-full m-0 rounded-none' : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Windows Fluent Top Header Bar */}
        <div className="bg-[#272727] border-b border-[#383838] px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ac471] shrink-0" />
            <h2 className="text-xs font-semibold text-[#f3f3f3] truncate">{app.title}</h2>
            <span className="text-[10px] text-[#a0a0a0] hidden sm:inline truncate">
              by {app.authorName || 'Creator'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#a0a0a0]">
            {/* Remix in Studio */}
            <button
              onClick={() => {
                onClose();
                onRemix(app);
              }}
              className="fluent-btn-primary px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer"
              title="Edit code in AI Studio"
            >
              <Sparkles className="w-3 h-3" />
              <span>Remix in Studio</span>
            </button>

            {/* Unpublish button if owner */}
            {canRemove && onRemove && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to remove "${app.title}" from the Community Gallery?`
                    )
                  ) {
                    onRemove(app.id);
                    onClose();
                  }
                }}
                className="px-2 py-1 rounded text-[#ff6b6b] hover:text-[#ff8787] hover:bg-[#3d1a1a] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                title="Remove from Community Gallery"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unpublish</span>
              </button>
            )}

            <div className="h-4 w-px bg-[#383838] mx-1" />

            {/* Reload Frame */}
            <button
              onClick={() => setKey((k) => k + 1)}
              className="p-1.5 rounded hover:bg-[#383838] hover:text-[#f3f3f3] text-[#a0a0a0] cursor-pointer"
              title="Restart Application"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* New Window */}
            <button
              onClick={handleOpenWindow}
              className="p-1.5 rounded hover:bg-[#383838] hover:text-[#f3f3f3] text-[#a0a0a0] cursor-pointer"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded hover:bg-[#383838] hover:text-[#f3f3f3] text-[#a0a0a0] cursor-pointer"
              title={isFullscreen ? 'Restore Window' : 'Maximize'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center text-[#a0a0a0] hover:bg-[#e81123] hover:text-white transition-colors cursor-pointer"
              title="Close Runner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Running Application Frame */}
        <div className="flex-1 bg-[#181818] relative">
          <iframe
            key={key}
            srcDoc={app.code}
            title={app.title}
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="w-full h-full border-none bg-[#181818]"
          />
        </div>
      </div>
    </div>
  );
};
