import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  Medal,
  Award,
  Users,
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

interface ScoreEntry {
  id: string;
  playerName: string;
  score: number;
  avatar: string;
  date: string;
}

const USER_STORAGE_KEY = 'beaver_studio_user';

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);

  // Fetch scores when modal opens or app changes
  useEffect(() => {
    if (isOpen && app) {
      fetchScores();
    }
  }, [isOpen, app?.id]);

  // Listen for postMessage from iframe for high score submissions
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!app) return;
      if (event.data && (event.data.type === 'SUBMIT_HIGH_SCORE' || event.data.score !== undefined)) {
        const scoreVal = Number(event.data.score);
        if (!isNaN(scoreVal)) {
          submitScore(scoreVal);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [app]);

  const fetchScores = async () => {
    if (!app) return;
    setLoadingScores(true);
    try {
      const res = await fetch(`/api/apps/${app.id}/scores`);
      if (res.ok) {
        const data = await res.json();
        setScores(data);
        localStorage.setItem(`abs_scores_${app.id}`, JSON.stringify(data));
        setLoadingScores(false);
        return;
      }
    } catch (e) {
      // Fallback to localStorage
    }

    try {
      const saved = localStorage.getItem(`abs_scores_${app.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.sort((a: ScoreEntry, b: ScoreEntry) => b.score - a.score);
        setScores(parsed);
      } else {
        setScores([]);
      }
    } catch (err) {
      setScores([]);
    }
    setLoadingScores(false);
  };

  const submitScore = async (scoreVal: number) => {
    if (!app) return;
    let playerName = 'Anonymous Player';
    let avatar = '';
    try {
      const userStr = localStorage.getItem(USER_STORAGE_KEY);
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) playerName = user.name;
        if (user.avatar) avatar = user.avatar;
      }
    } catch (e) {}

    const payload = { playerName, score: scoreVal, avatar };

    try {
      const res = await fetch(`/api/apps/${app.id}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scores) {
          setScores(data.scores);
          localStorage.setItem(`abs_scores_${app.id}`, JSON.stringify(data.scores));
          return;
        }
      }
    } catch (e) {}

    // Fallback local persistence
    const newEntry: ScoreEntry = {
      id: `score_${Date.now()}`,
      playerName,
      score: scoreVal,
      avatar,
      date: new Date().toISOString(),
    };
    const updated = [newEntry, ...scores].sort((a, b) => b.score - a.score).slice(0, 100);
    setScores(updated);
    localStorage.setItem(`abs_scores_${app.id}`, JSON.stringify(updated));
  };

  if (!isOpen || !app) return null;

  const handleOpenWindow = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(getEnhancedCode(app.code));
      win.document.close();
    }
  };

  // Inject high score helper bridge script into iframe srcDoc
  const getEnhancedCode = (rawCode: string) => {
    const bridgeScript = `
    <script>
      window.submitHighScore = function(score) {
        try {
          window.parent.postMessage({ type: 'SUBMIT_HIGH_SCORE', score: Number(score) }, '*');
        } catch(e) {}
      };
      // Also intercept localStorage high score updates to auto-sync
      const origSetItem = localStorage.setItem;
      localStorage.setItem = function(key, val) {
        origSetItem.apply(this, arguments);
        if (key.toLowerCase().includes('score') || key.toLowerCase().includes('high') || key.toLowerCase().includes('best')) {
          const num = Number(val);
          if (!isNaN(num) && num > 0) {
            window.submitHighScore(num);
          }
        }
      };
    </script>
    `;

    if (rawCode.includes('</head>')) {
      return rawCode.replace('</head>', `${bridgeScript}</head>`);
    } else if (rawCode.includes('<html')) {
      return rawCode.replace('<html', `<html><head>${bridgeScript}</head>`);
    }
    return `<!DOCTYPE html><html><head>${bridgeScript}</head><body>${rawCode}</body></html>`;
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
            {/* Global Leaderboard Button */}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                showLeaderboard
                  ? 'bg-[#3b82f6] text-white font-medium'
                  : 'bg-[#333333] hover:bg-[#3d3d3d] text-[#e0e0e0]'
              }`}
              title="Global Leaderboard (Everyone who played)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard</span>
            </button>

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

        {/* Main Content Area (Game + Global Leaderboard Sidebar) */}
        <div className="flex-1 flex bg-[#181818] relative overflow-hidden">
          {/* Live Running Application Frame */}
          <div className="flex-1 h-full relative">
            <iframe
              key={key}
              srcDoc={getEnhancedCode(app.code)}
              title={app.title}
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              className="w-full h-full border-none bg-[#181818]"
            />
          </div>

          {/* Global Leaderboard Sidebar */}
          {showLeaderboard && (
            <div className="w-80 bg-[#222222] border-l border-[#383838] flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="p-3.5 border-b border-[#333] flex items-center justify-between bg-[#282828]">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-[#f3f3f3] uppercase tracking-wider">
                    Global Leaderboard
                  </h3>
                </div>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-[#a0a0a0] hover:text-white text-xs cursor-pointer p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between text-[11px] text-[#a0a0a0]">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#60cdff]" />
                  <span>Shared with everyone</span>
                </span>
                <button
                  onClick={fetchScores}
                  className="text-[#60cdff] hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {loadingScores ? (
                  <div className="text-center py-8 text-xs text-[#888]">Loading global scores...</div>
                ) : scores.length === 0 ? (
                  <div className="text-center py-12 px-4 text-xs text-[#888]">
                    <Medal className="w-8 h-8 text-amber-500/30 mx-auto mb-2" />
                    <p className="font-medium text-[#ccc]">No high scores yet!</p>
                    <p className="mt-1 text-[11px] text-[#777]">
                      Play the game and set a high score. Scores are shared globally with everyone who plays!
                    </p>
                  </div>
                ) : (
                  scores.map((s, idx) => {
                    const isTop3 = idx < 3;
                    return (
                      <div
                        key={s.id || idx}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          idx === 0
                            ? 'bg-amber-950/20 border-amber-600/40'
                            : idx === 1
                            ? 'bg-slate-800/40 border-slate-600/40'
                            : idx === 2
                            ? 'bg-amber-900/10 border-amber-800/30'
                            : 'bg-[#272727] border-[#333]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 text-center font-bold text-xs ${
                              idx === 0
                                ? 'text-amber-400'
                                : idx === 1
                                ? 'text-slate-300'
                                : idx === 2
                                ? 'text-amber-600'
                                : 'text-[#777]'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          {s.avatar ? (
                            <img
                              src={s.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover border border-[#444]"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#383838] flex items-center justify-center text-[10px] text-white font-bold">
                              {s.playerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#f3f3f3] truncate">
                              {s.playerName}
                            </p>
                            <p className="text-[10px] text-[#888]">
                              {new Date(s.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-[#60cdff]">
                            {s.score.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer test score helper */}
              <div className="p-2.5 bg-[#1b1b1b] border-t border-[#333] text-center">
                <button
                  onClick={() => {
                    const testScore = prompt('Enter a test score to submit globally:', '1000');
                    if (testScore && !isNaN(Number(testScore))) {
                      submitScore(Number(testScore));
                    }
                  }}
                  className="text-[11px] text-[#60cdff] hover:underline cursor-pointer"
                >
                  + Submit Test Score
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
