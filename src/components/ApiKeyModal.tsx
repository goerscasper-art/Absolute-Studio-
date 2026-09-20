import React, { useState, useEffect } from 'react';
import { Key, Check, ShieldCheck, ExternalLink, X, RefreshCw } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeModel, setActiveModel] = useState('gemini-3.6-flash');

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('gemini_api_key') || '';
      setApiKey(stored);
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#202020] border border-[#383838] rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0f2d4a] border border-[#1b4e7a] flex items-center justify-center text-[#60cdff]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f3f3f3]">Gemini AI Engine</h2>
              <p className="text-xs text-[#a0a0a0]">Configure API Key for Cloudflare & Production</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a8a8a] hover:text-[#f3f3f3] p-1 rounded hover:bg-[#2b2b2b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-lg p-3 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#2ac471] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold text-[#f3f3f3]">Active Model: {activeModel}</div>
              <p className="text-[#8a8a8a] leading-relaxed">
                Studio Build includes a built-in preconfigured Gemini API key that works automatically in both Preview and Cloudflare deployments (<code className="text-[#60cdff]">workers.dev</code>).
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#d0d0d0] mb-1.5">
              Custom Gemini API Key <span className="text-[#707070] font-normal">(Optional Override)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
              }}
              placeholder="Paste your AI Studio API key (starts with AIzaSy...)"
              className="w-full text-xs px-3 py-2 rounded-lg bg-[#181818] border border-[#383838] focus:border-[#60cdff] focus:outline-none text-[#f3f3f3] font-mono transition-colors"
            />
            <p className="text-[11px] text-[#8a8a8a] mt-1.5">
              Leave empty to use the verified high-performance built-in Gemini key.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#60cdff] hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Get your Gemini Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {apiKey && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[#8a8a8a] hover:text-[#d0d0d0] flex items-center gap-1 text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#181818] border-t border-[#333333] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium text-[#d0d0d0] hover:bg-[#2b2b2b] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="fluent-btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save & Apply</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
