import React, { useState } from 'react';
import { Sparkles, Globe, FolderGit2, UploadCloud, Check, User, ChevronDown, Edit2, Key } from 'lucide-react';
import { StudioTab, UserProfile } from '../types';

interface HeaderProps {
  currentTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  appTitle: string;
  onRenameTitle: (newTitle: string) => void;
  onPublishClick: () => void;
  onSaveClick: () => void;
  isSaving: boolean;
  user: UserProfile;
  onOpenSignIn: () => void;
  publicAppsCount: number;
  onOpenApiKeyModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  appTitle,
  onRenameTitle,
  onPublishClick,
  onSaveClick,
  isSaving,
  user,
  onOpenSignIn,
  publicAppsCount,
  onOpenApiKeyModal,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(appTitle);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      onRenameTitle(titleInput.trim());
    } else {
      setTitleInput(appTitle);
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="bg-[#202020] border-b border-[#333333] px-4 py-2 flex items-center justify-between select-none shadow-xs sticky top-0 z-30">
      {/* Left: App Title Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[15px] text-[#f3f3f3] tracking-tight">Absolute Studio</span>
        </div>

        <div className="h-4 w-px bg-[#383838] mx-1" />

        {/* Current Project / Prompt Title */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="text-xs px-2 py-1 fluent-input font-medium text-[#f3f3f3] bg-[#282828] border-[#444444] w-48"
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setTitleInput(appTitle);
              setIsEditingTitle(true);
            }}
            className="group flex items-center gap-1.5 text-xs font-medium text-[#d1d1d1] hover:text-[#60cdff] px-2 py-1 rounded hover:bg-[#2a2a2a] transition-colors"
            title="Click to rename"
          >
            <span className="truncate max-w-[200px]">{appTitle}</span>
            <Edit2 className="w-3 h-3 text-[#8a8a8a] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Center: Google AI Studio Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-[#181818] p-0.5 rounded-md border border-[#333333]">
        <button
          onClick={() => onTabChange('builder')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            currentTab === 'builder'
              ? 'bg-[#2d2d2d] text-[#60cdff] shadow-xs font-semibold'
              : 'text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-[#242424]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Studio Workspace</span>
        </button>

        <button
          onClick={() => onTabChange('community')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            currentTab === 'community'
              ? 'bg-[#2d2d2d] text-[#60cdff] shadow-xs font-semibold'
              : 'text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-[#242424]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Community Explore</span>
          {publicAppsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-[#1b344d] text-[#60cdff] border border-[#274b70] rounded-full font-bold">
              {publicAppsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('my-builds')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            currentTab === 'my-builds'
              ? 'bg-[#2d2d2d] text-[#60cdff] shadow-xs font-semibold'
              : 'text-[#a0a0a0] hover:text-[#f3f3f3] hover:bg-[#242424]'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>My Builds</span>
        </button>
      </nav>

      {/* Right: Actions, Publish, Account & Windows Controls */}
      <div className="flex items-center gap-2">
        {/* Gemini AI Status / Key button */}
        {onOpenApiKeyModal && (
          <button
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#a0a0a0] hover:text-[#60cdff] bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] hover:border-[#444444] rounded transition-all cursor-pointer"
            title="Gemini AI Engine Settings (gemini-3.6-flash)"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#2ac471]" />
            <Key className="w-3 h-3 text-[#60cdff]" />
            <span className="hidden sm:inline font-mono text-[11px]">Gemini 3.6</span>
          </button>
        )}

        {/* Publish to Public Page */}
        <button
          onClick={onPublishClick}
          className="fluent-btn-primary px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Publish App</span>
        </button>

        <div className="h-4 w-px bg-[#383838] mx-0.5" />

        {/* User Sign In / Profile */}
        <button
          onClick={onOpenSignIn}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#2b2b2b] text-xs font-medium text-[#f3f3f3] transition-colors border border-transparent hover:border-[#383838]"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-5 h-5 rounded-full object-cover border border-[#383838]"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#0078d4] text-white flex items-center justify-center text-[10px] font-bold">
              {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
            </div>
          )}
          <span className="truncate max-w-[100px]">{user.name || 'Sign In'}</span>
          <ChevronDown className="w-3 h-3 text-[#8a8a8a]" />
        </button>
      </div>
    </header>
  );
};
