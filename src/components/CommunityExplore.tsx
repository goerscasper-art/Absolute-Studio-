import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Eye,
  Play,
  RotateCcw,
  Share2,
  Calendar,
  User,
  Plus,
  Compass,
  Trash2,
} from 'lucide-react';
import { AppBuild, UserProfile } from '../types';

interface CommunityExploreProps {
  publicApps: AppBuild[];
  onRunApp: (app: AppBuild) => void;
  onRemixApp: (app: AppBuild) => void;
  onRemovePublicApp?: (appId: string) => void;
  currentUser?: UserProfile;
  onGoToStudio: () => void;
  isLoading: boolean;
}

const isToolOrGameTag = (tag: string) => /^(tool|tools|game|games)$/i.test(tag.trim());

export const CommunityExplore: React.FC<CommunityExploreProps> = ({
  publicApps,
  onRunApp,
  onRemixApp,
  onRemovePublicApp,
  currentUser,
  onGoToStudio,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const isOwner = (_app: AppBuild) => true;

  // Filter apps
  const filteredApps = publicApps.filter((app) => {
    const matchesSearch =
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.tags &&
        app.tags
          .filter((t) => !isToolOrGameTag(t))
          .some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesTag =
      selectedTag === 'All' ||
      (app.tags && app.tags.filter((t) => !isToolOrGameTag(t)).includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  // Extract all unique tags, excluding tool and game labels
  const allTags = [
    'All',
    ...Array.from(new Set(publicApps.flatMap((a) => a.tags || []))).filter(
      (tag) => !isToolOrGameTag(tag)
    ),
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#181818] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-[#202020] border border-[#383838] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-[#60cdff]" />
              <h1 className="text-xl font-semibold text-[#f3f3f3]">Community Gallery</h1>
            </div>
            <p className="text-xs text-[#a0a0a0] max-w-xl">
              Explore applications built by creators in Studio. Run any app instantly in your browser or remix its code in the AI Studio builder.
            </p>
          </div>

          <button
            onClick={onGoToStudio}
            className="fluent-btn-primary px-4 py-2 text-xs flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Build New App</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8a8a8a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search published applications or creators..."
              className="w-full pl-9 pr-4 py-2 text-xs fluent-input bg-[#242424] text-[#f3f3f3] border-[#383838] placeholder:text-[#707070]"
            />
          </div>
        </div>

        {/* Main Content: Zero Default Apps State vs App Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-[#60cdff] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#a0a0a0]">Loading community builds...</p>
          </div>
        ) : publicApps.length === 0 ? (
          /* Strictly NO default apps created by default per instructions */
          <div className="bg-[#202020] border border-[#383838] rounded-xl p-12 text-center shadow-xs flex flex-col items-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#1b344d] border border-[#274b70] flex items-center justify-center text-[#60cdff] mb-4 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-base font-semibold text-[#f3f3f3] mb-2">
              No Public Apps Published Yet
            </h2>
            <p className="text-xs text-[#a0a0a0] mb-6 leading-relaxed">
              You have a completely clean slate. When you or anyone creates an application in Beaver Studio and clicks <strong>"Publish App"</strong>, it will appear here for everyone to run and remix.
            </p>
            <button
              onClick={onGoToStudio}
              className="fluent-btn-primary px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create the First Application</span>
            </button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-[#202020] border border-[#383838] rounded-xl p-8 text-center text-[#a0a0a0] text-xs">
            No applications match your search query "{searchQuery}".
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="fluent-card overflow-hidden flex flex-col hover:border-[#60cdff] hover:shadow-lg transition-all group bg-[#242424] border border-[#383838]"
              >
                {/* Live Preview Thumbnail Container */}
                <div className="h-44 bg-[#1a1a1a] border-b border-[#333333] relative overflow-hidden flex items-center justify-center">
                  <iframe
                    srcDoc={app.code}
                    title={app.title}
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full pointer-events-none scale-[0.8] origin-top opacity-90 group-hover:opacity-100 transition-opacity bg-[#1a1a1a]"
                  />

                  {/* Play Overlay Button */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 flex items-center justify-center transition-colors">
                    <button
                      onClick={() => onRunApp(app)}
                      className="w-11 h-11 rounded-full bg-[#0078d4] text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      title="Run Fullscreen App"
                    >
                      <Play className="w-5 h-5 ml-0.5" />
                    </button>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-sm text-[#f3f3f3] truncate group-hover:text-[#60cdff] transition-colors">
                        {app.title}
                      </h3>
                      {onRemovePublicApp && isOwner(app) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Are you sure you want to remove "${app.title}" from the Community Gallery?`
                              )
                            ) {
                              onRemovePublicApp(app.id);
                            }
                          }}
                          className="text-xs text-[#ff6b6b] hover:text-[#ff8787] p-1 rounded hover:bg-[#3d1a1a] transition-colors cursor-pointer shrink-0"
                          title="Remove from Community Gallery"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-[#a0a0a0] line-clamp-2 leading-relaxed mb-3">
                      {app.description}
                    </p>
                  </div>

                  {/* Author & Footer Actions */}
                  <div className="pt-3 border-t border-[#333333] flex items-center justify-between text-[11px] text-[#a0a0a0]">
                    <div className="flex items-center gap-1.5 truncate">
                      {app.authorAvatar ? (
                        <img
                          src={app.authorAvatar}
                          alt={app.authorName}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 text-[#8a8a8a]" />
                      )}
                      <span className="truncate max-w-[90px]">{app.authorName || 'Creator'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRemixApp(app)}
                        className="text-[#60cdff] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                        title="Open code in Studio"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Remix</span>
                      </button>

                      <button
                        onClick={() => onRunApp(app)}
                        className="fluent-btn-primary px-2.5 py-1 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Run</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
