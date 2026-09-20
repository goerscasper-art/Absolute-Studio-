import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Play,
  RotateCcw,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Download,
  Maximize2,
  History,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ChatMessage, EditorView } from '../types';

interface StudioWorkspaceProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  appTitle: string;
  onGenerate: (prompt: string, settings?: { model?: string; temperature?: number }) => Promise<void>;
  isGenerating: boolean;
  messages: ChatMessage[];
  onRollbackCode: (snapshotCode: string) => void;
  suggestedPrompts: string[];
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  code,
  onCodeChange,
  appTitle,
  onGenerate,
  isGenerating,
  messages,
  onRollbackCode,
  suggestedPrompts,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [editorView, setEditorView] = useState<EditorView>('preview');
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash-lite');
  const [modelTemperature, setModelTemperature] = useState(0.7);
  const [previewKey, setPreviewKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;
    const p = promptInput.trim();
    setPromptInput('');
    onGenerate(p, { model: selectedModel, temperature: modelTemperature });
  };

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'studio-app'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewWindow = () => {
    if (!code) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(code);
      win.document.close();
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#181818]">
      {/* LEFT COLUMN: Google AI Studio Prompt & Agent Panel */}
      <div className="w-full md:w-[420px] lg:w-[460px] flex flex-col bg-[#202020] border-r border-[#333333] h-full shadow-xs">
        {/* Model & Agent Settings Bar */}
        <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2e2e2e] flex items-center justify-between text-xs text-[#a0a0a0]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2ac471]"></span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent font-semibold text-[#f3f3f3] text-xs focus:outline-none cursor-pointer hover:text-[#60cdff] transition-colors"
            >
              <option value="gemini-3.5-flash-lite" className="bg-[#202020] text-[#f3f3f3]">gemini-3.5-flash-lite</option>
              <option value="gemini-flash-lite-latest" className="bg-[#202020] text-[#f3f3f3]">gemini-flash-lite-latest</option>
              <option value="gemini-3.6-flash" className="bg-[#202020] text-[#f3f3f3]">gemini-3.6-flash</option>
              <option value="gemini-3.8-flash" className="bg-[#202020] text-[#f3f3f3]">gemini-3.8-flash</option>
            </select>
            <span className="px-1.5 py-0.5 rounded bg-[#2c2c2c] text-[10px] text-[#a0a0a0]">
              Live AI
            </span>
          </div>
        </div>

        {/* Conversation History & Build Steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="py-8 px-2 flex flex-col items-center text-center text-[#a0a0a0]">
              <div className="w-12 h-12 rounded-xl bg-[#1b344d] border border-[#274b70] flex items-center justify-center text-[#60cdff] mb-3 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm text-[#f3f3f3] mb-1">AI Studio Builder</h3>
              <p className="text-xs text-[#a0a0a0] max-w-xs leading-relaxed">
                Describe the web application you want to create. The AI will write, compile, and run it live in the preview stage.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-1.5">
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-2.5 justify-end">
                    <div className="bg-[#1b344d] border border-[#274b70] text-[#f3f3f3] rounded-lg p-3 text-xs max-w-[85%] shadow-2xs">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <span className="text-[10px] text-[#90b8e2] mt-1 block text-right font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#0078d4] text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#107c41] text-white flex items-center justify-center text-[10px] font-semibold shrink-0 shadow-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-[#282828] border border-[#383838] text-[#f3f3f3] rounded-lg p-3 text-xs flex-1 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-[#333333] pb-1.5">
                        <span className="font-semibold text-[#60cdff] flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#2ac471]" /> Build Complete
                        </span>
                        <span className="text-[10px] text-[#8a8a8a] font-mono">{msg.timestamp}</span>
                      </div>

                      {msg.summary && (
                        <p className="text-[#d1d1d1] leading-relaxed text-xs">{msg.summary}</p>
                      )}

                      {msg.codeSnapshot && (
                        <div className="pt-1 flex items-center justify-between border-t border-[#333333]">
                          <span className="text-[10px] text-[#8a8a8a]">Version Snapshot</span>
                          <button
                            onClick={() => onRollbackCode(msg.codeSnapshot!)}
                            className="text-[11px] text-[#60cdff] hover:underline flex items-center gap-1 font-medium"
                          >
                            <History className="w-3 h-3" /> Restore this version
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* AI Generating Indicator */}
          {isGenerating && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#0078d4] text-white flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-[#1f2833] border border-[#2b4461] rounded-lg p-3 text-xs text-[#f3f3f3] flex-1 space-y-2">
                <div className="flex items-center gap-2 font-medium text-[#60cdff]">
                  <div className="w-3 h-3 border-2 border-[#60cdff] border-t-transparent rounded-full animate-spin" />
                  <span>Generating high-quality application...</span>
                </div>
                <div className="space-y-1 text-[11px] text-[#a0a0a0]">
                  <p className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[#2ac471]" /> Formulating software architecture
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#60cdff] animate-ping" /> Synthesizing complete HTML5, Tailwind CSS, & JavaScript
                  </p>
                  <p className="text-[#8a8a8a] pl-3">Rendering into interactive sandbox...</p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Follow-up Suggestions */}
        {suggestedPrompts && suggestedPrompts.length > 0 && !isGenerating && (
          <div className="px-4 py-2 border-t border-[#2e2e2e] bg-[#1a1a1a]">
            <div className="text-[10px] font-semibold text-[#8a8a8a] uppercase mb-1.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#60cdff]" /> Next iteration ideas:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedPrompts.slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setPromptInput(prompt)}
                  className="text-[11px] px-2.5 py-1 bg-[#282828] hover:bg-[#333e4d] text-[#e0e0e0] hover:text-[#60cdff] border border-[#3d3d3d] hover:border-[#60cdff] rounded-full transition-colors text-left truncate max-w-full cursor-pointer"
                >
                  + {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompt Input Box */}
        <div className="p-3 bg-[#202020] border-t border-[#333333]">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                code
                  ? "Describe changes or new features (e.g., 'Add export to CSV', 'Add audio chimes', 'Add analytics chart')..."
                  : "Tell the AI what to make (e.g., 'A personal finance tracker with income/expenses chart and savings goals')..."
              }
              rows={3}
              className="w-full text-xs p-2.5 pb-8 fluent-input resize-none bg-[#282828] text-[#f3f3f3] placeholder:text-[#777777] border-[#3d3d3d] leading-relaxed"
            />

            <div className="absolute bottom-2 right-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={!promptInput.trim() || isGenerating}
                className="fluent-btn-primary px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Building...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>{code ? 'Iterate' : 'Build App'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Google AI Studio Canvas & Preview Stage */}
      <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden">
        {/* Studio Canvas Control Bar */}
        <div className="h-10 bg-[#202020] border-b border-[#333333] px-4 flex items-center justify-between select-none">
          {/* View Mode: Live Preview vs Code Inspector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditorView('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                editorView === 'preview'
                  ? 'bg-[#2b3542] text-[#60cdff] font-semibold'
                  : 'text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-[#282828]'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>

            <button
              onClick={() => setEditorView('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                editorView === 'code'
                  ? 'bg-[#2b3542] text-[#60cdff] font-semibold'
                  : 'text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-[#282828]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Inspector</span>
            </button>
          </div>

          {/* Canvas Actions: Reload, Open Tab, Copy Code, Download */}
          <div className="flex items-center gap-1.5">
            {editorView === 'preview' ? (
              <>
                <button
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="p-1.5 text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-[#282828] rounded transition-colors cursor-pointer"
                  title="Reload Preview Frame"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleOpenInNewWindow}
                  className="p-1.5 text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-[#282828] rounded transition-colors cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopyCode}
                  className="fluent-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#2ac471]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy HTML</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="fluent-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1 cursor-pointer"
                  title="Download HTML file"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Canvas Stage Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center">
          {editorView === 'preview' ? (
            code ? (
              <div className="w-full h-full bg-[#202020] rounded-lg shadow-md border border-[#383838] flex flex-col overflow-hidden transition-all duration-200">
                {/* Windows 11 Fluent App Frame Title Bar */}
                <div className="bg-[#1c1c1c] border-b border-[#2e2e2e] px-3 py-1.5 flex items-center justify-between text-xs text-[#a0a0a0] select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2ac471]"></span>
                    <span className="font-medium text-[#f3f3f3] truncate max-w-[240px]">
                      {appTitle || 'Preview Sandbox'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#8a8a8a]">
                    <span>Sandboxed Iframe</span>
                  </div>
                </div>

                {/* Sandboxed Interactive App Runner */}
                <iframe
                  key={previewKey}
                  ref={iframeRef}
                  srcDoc={code}
                  title="App Preview"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className="w-full flex-1 border-none bg-[#181818]"
                />
              </div>
            ) : (
              /* Empty Stage Placeholder */
              <div className="max-w-md w-full p-8 text-center bg-[#202020] rounded-xl border border-[#383838] shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#1b344d] border border-[#274b70] flex items-center justify-center text-[#60cdff] mx-auto mb-4">
                  <Play className="w-7 h-7 ml-0.5" />
                </div>
                <h3 className="font-semibold text-base text-[#f3f3f3] mb-2">
                  Ready to Build
                </h3>
                <p className="text-xs text-[#a0a0a0] mb-6 leading-relaxed">
                  Enter any prompt on the left to generate a fully functional, high-quality application with interactive state and beautiful styling.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() =>
                      onGenerate('A modern Kanban Task Board with drag and drop, tags, and progress stats')
                    }
                    className="fluent-btn-secondary py-2 px-3 text-xs text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>Try: Modern Kanban Task Board</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#60cdff]" />
                  </button>
                  <button
                    onClick={() =>
                      onGenerate('A full-featured Pomodoro Focus Timer with audio chimes and daily metrics')
                    }
                    className="fluent-btn-secondary py-2 px-3 text-xs text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>Try: Pomodoro Focus Timer</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#60cdff]" />
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Code Inspector View - Dark Mode */
            <div className="w-full h-full bg-[#181818] text-[#d4d4d4] rounded-lg shadow-md border border-[#383838] flex flex-col overflow-hidden font-mono text-xs">
              <div className="bg-[#202020] px-4 py-2 border-b border-[#303030] flex items-center justify-between text-[#a0a0a0]">
                <div className="flex items-center gap-2">
                  <span className="text-[#60cdff] font-bold">HTML</span>
                  <span className="text-[#f3f3f3] text-xs font-sans font-medium">app.html</span>
                  <span className="text-[10px] text-[#8a8a8a]">({code.length} characters)</span>
                </div>
                <div className="text-[10px] text-[#8a8a8a]">UTF-8 • Standalone Single-Page App</div>
              </div>

              <div className="flex-1 overflow-auto p-4 leading-relaxed select-text bg-[#121212]">
                <pre className="text-xs font-mono text-[#9cdcfe] whitespace-pre-wrap break-words">
                  {code || '<!-- No code generated yet -->'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
