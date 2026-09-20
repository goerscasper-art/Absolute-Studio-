import React from 'react';
import { FolderGit2, Edit3, Trash2, UploadCloud, EyeOff, Calendar, Plus } from 'lucide-react';
import { AppBuild } from '../types';

interface MyBuildsProps {
  builds: AppBuild[];
  onOpenBuild: (build: AppBuild) => void;
  onDeleteBuild: (buildId: string) => void;
  onPublishBuild: (build: AppBuild) => void;
  onUnpublishBuild: (build: AppBuild) => void;
  onNewBuild: () => void;
}

export const MyBuilds: React.FC<MyBuildsProps> = ({
  builds,
  onOpenBuild,
  onDeleteBuild,
  onPublishBuild,
  onUnpublishBuild,
  onNewBuild,
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#181818] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-[#202020] border border-[#383838] rounded-xl p-6 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderGit2 className="w-5 h-5 text-[#60cdff]" />
              <h1 className="text-xl font-semibold text-[#f3f3f3]">My Saved Builds</h1>
            </div>
            <p className="text-xs text-[#a0a0a0]">
              Every application you generate or iterate on is automatically saved here. You can reopen any build or publish it to the Community Gallery.
            </p>
          </div>

          <button
            onClick={onNewBuild}
            className="fluent-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>

        {builds.length === 0 ? (
          <div className="bg-[#202020] border border-[#383838] rounded-xl p-12 text-center shadow-xs flex flex-col items-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#1b344d] border border-[#274b70] flex items-center justify-center text-[#60cdff] mb-3">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <h2 className="text-sm font-semibold text-[#f3f3f3] mb-1">No Saved Builds Yet</h2>
            <p className="text-xs text-[#a0a0a0] mb-4">
              When you prompt the AI in Studio, your builds are safely stored here.
            </p>
            <button
              onClick={onNewBuild}
              className="fluent-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start Building in Studio</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {builds.map((b) => (
              <div
                key={b.id}
                className="fluent-card bg-[#242424] border border-[#383838] p-4 flex flex-col justify-between space-y-4 hover:border-[#60cdff] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-[#f3f3f3]">{b.title}</h3>
                    {b.isPublic ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#133820] text-[#2ac471] font-medium border border-[#1b5e32]">
                        Public
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2d2d2d] text-[#a0a0a0] font-medium border border-[#3d3d3d]">
                        Private Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#a0a0a0] mt-1 line-clamp-2 leading-relaxed">
                    {b.description || 'Custom web application created in Studio'}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-[#8a8a8a] mt-2 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#333333] flex items-center justify-between">
                  <button
                    onClick={() => onDeleteBuild(b.id)}
                    className="text-xs text-[#ff6b6b] hover:text-[#ff8787] p-1.5 rounded hover:bg-[#3d1a1a] transition-colors cursor-pointer"
                    title="Delete build"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {b.isPublic && (
                      <button
                        onClick={() => onUnpublishBuild(b)}
                        className="fluent-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 text-[#ff6b6b] hover:text-[#ff8787] hover:bg-[#3d1a1a] border-[#4a2424] cursor-pointer"
                        title="Remove from Community Gallery"
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Unpublish</span>
                      </button>
                    )}

                    <button
                      onClick={() => onPublishBuild(b)}
                      className="fluent-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <UploadCloud className="w-3 h-3 text-[#60cdff]" />
                      <span>{b.isPublic ? 'Update Public' : 'Publish'}</span>
                    </button>

                    <button
                      onClick={() => onOpenBuild(b)}
                      className="fluent-btn-primary px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Open in Studio</span>
                    </button>
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
