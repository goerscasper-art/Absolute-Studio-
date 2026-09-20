import React, { useState } from 'react';
import { X, User, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { CHARACTER_PERSONAS, getDefaultNameForAvatar } from '../utils/characters';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

const AVATAR_OPTIONS = CHARACTER_PERSONAS.map(p => p.avatar);

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  user,
  onSaveProfile,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(user.name || 'Creator');
  const [email, setEmail] = useState(user.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || AVATAR_OPTIONS[0]);

  const handleSelectAvatar = (av: string) => {
    setSelectedAvatar(av);
    const defaultName = getDefaultNameForAvatar(av);
    setName(defaultName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      id: user.id || `user_${Date.now()}`,
      name: name.trim() || 'Anonymous Creator',
      email: email.trim(),
      avatar: selectedAvatar,
      signedIn: true,
    });
    onClose();
  };

  const handleSignOut = () => {
    onSaveProfile({
      id: `user_guest`,
      name: 'Guest User',
      email: '',
      avatar: '',
      signedIn: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#202020] border border-[#383838] rounded-xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar */}
        <div className="bg-[#272727] border-b border-[#383838] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#60cdff]" />
            <h2 className="text-xs font-semibold text-[#f3f3f3]">
              {user.signedIn ? 'Creator Profile' : 'Sign In to Studio'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-[#a0a0a0] hover:bg-[#383838] hover:text-[#f3f3f3] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Avatar Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-medium text-[#e0e0e0]">Select Character</label>
              <span className="text-[10px] text-[#a0a0a0]">
                {selectedAvatar === AVATAR_OPTIONS[0] && 'Girl on left (Emo)'}
                {selectedAvatar === AVATAR_OPTIONS[1] && 'Guy on center left (Peanut Butter)'}
                {selectedAvatar === AVATAR_OPTIONS[2] && 'Girl in center (White Girl)'}
                {selectedAvatar === AVATAR_OPTIONS[3] && 'Guy on center right (Joker w/o Makeup)'}
                {selectedAvatar === AVATAR_OPTIONS[4] && 'Guy on right (White Male Protagonist)'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {AVATAR_OPTIONS.map((av, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectAvatar(av)}
                  className={`relative rounded-full p-0.5 transition-all cursor-pointer ${
                    selectedAvatar === av ? 'ring-2 ring-[#60cdff] scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={
                    idx === 0 ? 'Girl on left (Emo)' :
                    idx === 1 ? 'Guy on center left (Peanut butter)' :
                    idx === 2 ? 'Girl in center (White girl)' :
                    idx === 3 ? 'Guy on center right (Joker w/o makeup)' : 'Guy on right (White male protagonist)'
                  }
                >
                  <img
                    src={av}
                    alt={`Avatar ${idx}`}
                    className="w-9 h-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {selectedAvatar === av && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#0078d4] text-white rounded-full flex items-center justify-center text-[8px]">
                      <Check className="w-2 h-2" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#e0e0e0] mb-1">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 fluent-input bg-[#282828] border-[#3d3d3d] text-[#f3f3f3] placeholder:text-[#707070]"
              placeholder="e.g., Alex Johnson"
            />
          </div>

          <div>
            <label className="block font-medium text-[#e0e0e0] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 fluent-input bg-[#282828] border-[#3d3d3d] text-[#f3f3f3] placeholder:text-[#707070]"
              placeholder="name@example.com"
            />
          </div>

          <div className="p-2.5 bg-[#282828] rounded border border-[#383838] flex items-center gap-2 text-[11px] text-[#a0a0a0]">
            <ShieldCheck className="w-4 h-4 text-[#2ac471] shrink-0" />
            <span>Signed-in sessions auto-save your builds and allow 1-click publishing.</span>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {user.signedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] text-[#ff6b6b] hover:underline cursor-pointer"
              >
                Sign Out
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
                className="fluent-btn-primary px-4 py-1.5 text-xs font-medium cursor-pointer"
              >
                {user.signedIn ? 'Save Profile' : 'Sign In'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
