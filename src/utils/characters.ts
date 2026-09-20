export interface CharacterPersona {
  role: string;
  avatar: string;
  defaultName: string;
}

export const CHARACTER_PERSONAS: CharacterPersona[] = [
  {
    role: 'girl on left (emo)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    defaultName: 'Emo'
  },
  {
    role: 'guy on center left (peanut butter)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    defaultName: 'Peanut Butter'
  },
  {
    role: 'girl in center (white girl)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    defaultName: 'White Girl'
  },
  {
    role: 'guy on center right (joker without makeup)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    defaultName: 'Joker Without Makeup'
  },
  {
    role: 'guy on right (white male protagonist)',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    defaultName: 'White Male Protagonist'
  }
];

export function getRandomPersona() {
  const p = CHARACTER_PERSONAS[Math.floor(Math.random() * CHARACTER_PERSONAS.length)];
  return { avatar: p.avatar, name: p.defaultName };
}

export function getDefaultNameForAvatar(avatarUrl: string) {
  const found = CHARACTER_PERSONAS.find(c => c.avatar === avatarUrl);
  if (!found) return 'Creator';
  return found.defaultName;
}
