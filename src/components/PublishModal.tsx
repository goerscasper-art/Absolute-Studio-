import React, { useState } from 'react';
import { X, UploadCloud, Check, Sparkles, Trash2 } from 'lucide-react';
import { UserProfile } from '../types';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (details: {
    title: string;
    description: string;
    tags: string[];
    authorName: string;
  }) => Promise<void>;
  onUnpublish?: () => Promise<void>;
  isAlreadyPublished?: boolean;
  initialTitle: string;
  user: UserProfile;
  isPublishing: boolean;
}

const COMMON_TAGS = ['Productivity', 'Dashboard', 'Calculator', 'Creative', 'Finance', 'Utility'];

const isToolOrGameTag = (tag: string) => /^(tool|tools|game|games)$/i.test(tag.trim());

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  onUnpublish,
  isAlreadyPublished,
  initialTitle,
  user,
  isPublishing,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialTitle || 'My Interactive Web App');
  const [description, setDescription] = useState('An interactive single-page application built with AI in Studio.');
  const [authorName, setAuthorName] = useState(user.name || 'Anonymous Creator');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Productivity']);
  const [customTag, setCustomTag] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTag.trim()) {
      e.preventDefault();
      const t = customTag.trim();
      if (!isToolOrGameTag(t) && !selectedTags.includes(t)) {
        setSelectedTags([...selectedTags, t]);
      }
      setCustomTag('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onPublish({
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags.filter((t) => !isToolOrGameTag(t)),
      authorName: authorName.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#202020] border border-[#383838] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Windows Fluent Modal Title Bar */}
        <div className="bg-[#272727] border-b border-[#383838] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#60cdff]" />
            <h2 className="text-xs font-semibold text-[#f3f3f3]">Publish to Community Gallery</h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-[#a0a0a0] hover:bg-[#383838] hover:text-[#f3f3f3] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#e0e0e0] mb-1">Application Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 fluent-input bg-[#282828] border-[#3d3d3d] text-[#f3f3f3] placeholder:text-[#707070]"
              placeholder="e.g., Financial Tracker & Planner"
            />
          </div>

          <div>
            <label className="block font-medium text-[#e0e0e0] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 fluent-input bg-[#282828] border-[#3d3d3d] text-[#f3f3f3] placeholder:text-[#707070] resize-none leading-relaxed"
              placeholder="What does this application do? Outline key features..."
            />
          </div>

          <div>
            <label className="block font-medium text-[#e0e0e0] mb-1">Author Display Name</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-3 py-2 fluent-input bg-[#282828] border-[#3d3d3d] text-[#f3f3f3] placeholder:text-[#707070]"
              placeholder="Your name or handle"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-medium text-[#e0e0e0] mb-1.5">Category Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedTags.includes(tag)
                      ? 'bg-[#0078d4] text-white'
                      : 'bg-[#2d2d2d] text-[#a0a0a0] hover:bg-[#383838] hover:text-[#f3f3f3] border border-[#3d3d3d]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={handleAddCustomTag}
              placeholder="Type a custom tag and press Enter..."
              className="w-full px-3 py-1.5 fluent-input bg-[#282828] border-[#3d3d3d] text-[#f3f3f3] placeholder:text-[#707070] text-[11px]"
            />
          </div>

          {/* Notice */}
          <div className="p-3 bg-[#182736] border border-[#204060] rounded-md text-[#60cdff] text-[11px] leading-relaxed">
            By publishing, your application and code will be visible to everyone on the Community Explore page. Other creators will be able to run and remix it.
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#333333] flex items-center justify-between gap-2">
            {isAlreadyPublished && onUnpublish ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Remove this application from the Community Gallery?')) {
                    await onUnpublish();
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-xs text-[#ff6b6b] hover:text-[#ff8787] hover:bg-[#3d1a1a] rounded border border-[#5a2020] flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Remove from Community Gallery"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from Community</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="fluent-btn-secondary px-3 py-1.5 text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPublishing || !title.trim()}
                className="fluent-btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isAlreadyPublished ? 'Update Publication' : 'Publish Now'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
