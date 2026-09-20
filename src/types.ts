export interface AppBuild {
  id: string;
  title: string;
  description: string;
  code: string;
  prompt: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  tags: string[];
  views: number;
  likes: number;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  isPublic?: boolean;
  publishedAppId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  codeSnapshot?: string;
  summary?: string;
  suggestedPrompts?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  signedIn: boolean;
}

export type StudioTab = 'builder' | 'community' | 'my-builds';
export type PreviewMode = 'desktop' | 'tablet' | 'mobile';
export type EditorView = 'preview' | 'code';
