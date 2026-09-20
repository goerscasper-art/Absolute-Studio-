import React from 'react';
import { Wifi, Cpu, Check, FileCode, Layers } from 'lucide-react';

interface StatusBarProps {
  hasApiKey: boolean;
  codeLength: number;
  publicAppsCount: number;
  isGenerating: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  hasApiKey,
  codeLength,
  publicAppsCount,
  isGenerating,
}) => {
  return (
    <footer className="windows-status-bar h-6 px-3 flex items-center justify-between select-none">
      {/* Left: Status & Engine */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {isGenerating ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[#60cdff] animate-ping" />
              <span className="text-[#60cdff] font-medium">Synthesizing code...</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-[#2ac471]" />
              <span className="text-[#d0d0d0]">Ready</span>
            </>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[#8a8a8a]">
          <Cpu className="w-3 h-3 text-[#707070]" />
          <span>Gemini 3.8 Flash</span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-[#8a8a8a]">
          <Layers className="w-3 h-3 text-[#707070]" />
          <span>Community: {publicAppsCount} {publicAppsCount === 1 ? 'build' : 'builds'}</span>
        </div>
      </div>

      {/* Right: Technical Stats */}
      <div className="flex items-center gap-4">
        {codeLength > 0 && (
          <div className="flex items-center gap-1 font-mono text-[#8a8a8a]">
            <FileCode className="w-3 h-3 text-[#707070]" />
            <span>{(codeLength / 1024).toFixed(1)} KB</span>
          </div>
        )}

        <div className="hidden sm:inline font-mono text-[#8a8a8a]">UTF-8</div>
        <div className="hidden sm:inline text-[#8a8a8a]">HTML5 / Tailwind</div>

        <div className="flex items-center gap-1 text-[#2ac471]">
          <Wifi className="w-3 h-3" />
          <span className="text-[10px]">Cloud Connected</span>
        </div>
      </div>
    </footer>
  );
};
