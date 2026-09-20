import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StudioWorkspace } from './components/StudioWorkspace';
import { CommunityExplore } from './components/CommunityExplore';
import { MyBuilds } from './components/MyBuilds';
import { PublishModal } from './components/PublishModal';
import { SignInModal } from './components/SignInModal';
import { AppRunnerModal } from './components/AppRunnerModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { StatusBar } from './components/StatusBar';
import { StudioTab, AppBuild, ChatMessage, UserProfile } from './types';
import { generateAppClientSide } from './utils/clientGeminiGenerator';
import { getRandomPersona } from './utils/characters';

const USER_STORAGE_KEY = 'beaver_studio_user';
const LOCAL_BUILDS_KEY = 'beaver_studio_builds';

export default function App() {
  const [currentTab, setCurrentTab] = useState<StudioTab>('builder');
  const [appTitle, setAppTitle] = useState('Untitled Application');
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // User session
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    const persona = getRandomPersona();
    return {
      id: 'user_guest',
      name: persona.name,
      email: '',
      avatar: persona.avatar,
      signedIn: false,
    };
  });

  // Public Community Apps (strictly NO default mock apps)
  const [publicApps, setPublicApps] = useState<AppBuild[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);

  // Robust JSON fetch helper for Cloudflare Workers / serverless compatibility
  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { error: text || res.statusText || 'Server returned invalid response' };
      }
      if (!res.ok) {
        throw new Error(data.error || text || `Server returned ${res.status}`);
      }
      return data;
    } catch (networkErr) {
      if (url === '/api/apps/public') {
        const saved = localStorage.getItem('abs_public_apps');
        if (saved) {
          try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
      }
      if (url === '/api/health') {
        return { status: 'ok', hasApiKey: true };
      }
      throw networkErr;
    }
  };

  // User Builds
  const [userBuilds, setUserBuilds] = useState<AppBuild[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_BUILDS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Modals state
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [runningApp, setRunningApp] = useState<AppBuild | null>(null);

  // Fetch public apps on load
  const fetchPublicApps = useCallback(async () => {
    try {
      setIsLoadingPublic(true);
      const data = await safeFetchJson('/api/apps/public');
      if (Array.isArray(data)) {
        setPublicApps(data);
      }
    } catch (err) {
      console.error('Failed to fetch public apps:', err);
    } finally {
      setIsLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicApps();

    // Check health
    safeFetchJson('/api/health')
      .then((data) => setHasApiKey(data.hasApiKey))
      .catch(() => {});
  }, [fetchPublicApps]);

  // Save user profile
  const handleSaveProfile = (newProfile: UserProfile) => {
    setUser(newProfile);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newProfile));
    } catch (e) {}
  };

  // Generate App using AI
  const handleGenerate = async (promptText: string, settings?: { model?: string; temperature?: number }) => {
    setIsGenerating(true);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      let data: any;
      try {
        data = await safeFetchJson('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            currentCode: code,
            appTitle,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
            settings: settings || {},
          }),
        });
      } catch (apiErr) {
        console.warn('API /api/generate unavailable on workers.dev, utilizing robust client-side generator:', apiErr);
        data = await generateAppClientSide(promptText, code, appTitle);
      }

      if (data.code) {
        setCode(data.code);
      }
      if (data.appTitle) {
        setAppTitle(data.appTitle);
      }
      if (data.suggestedNextPrompts) {
        setSuggestedPrompts(data.suggestedNextPrompts);
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `Application generated using ${data.modelUsed || 'Gemini Flash'}.`,
        summary: data.summaryOfChanges || `Built "${data.appTitle}" with complete interactivity and styling.`,
        codeSnapshot: data.code,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: data.suggestedNextPrompts,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-save this build
      const buildId = `build_${Date.now()}`;
      const newBuild: AppBuild = {
        id: buildId,
        title: data.appTitle || appTitle,
        description: data.description || `Built from prompt: "${promptText}"`,
        code: data.code,
        prompt: promptText,
        authorName: user.name || 'Casper',
        authorEmail: user.email,
        authorAvatar: user.avatar,
        tags: ['Interactive', 'Web App'],
        views: 1,
        likes: 0,
        createdAt: new Date().toISOString(),
        userId: user.id,
      };

      setUserBuilds((prev) => {
        const updated = [newBuild, ...prev];
        localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(updated));
        return updated;
      });

      // Sync with server save
      fetch('/api/apps/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBuild),
      }).catch(() => {});
    } catch (err: any) {
      console.error('Generation error:', err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: 'AI Generation was unable to complete this request.',
        summary: err?.message || 'Error communicating with Gemini AI. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-save build when code or title changes
  useEffect(() => {
    if (!code) return;
    const timer = setTimeout(() => {
      handleSaveBuild();
    }, 1200);
    return () => clearTimeout(timer);
  }, [code, appTitle]);

  // Manual Save Build
  const handleSaveBuild = async () => {
    if (!code) return;
    setIsSaving(true);
    try {
      const existingIdx = userBuilds.findIndex((b) => b.title === appTitle);
      const buildId = existingIdx >= 0 ? userBuilds[existingIdx].id : `build_${Date.now()}`;

      const savedBuild: AppBuild = {
        id: buildId,
        title: appTitle,
        description: `Saved build of ${appTitle}`,
        code,
        prompt: messages[messages.length - 1]?.content || 'Interactive Studio Build',
        authorName: user.name || 'Creator',
        authorEmail: user.email,
        authorAvatar: user.avatar,
        tags: ['Saved Build', 'Studio'],
        views: 1,
        likes: 0,
        createdAt: new Date().toISOString(),
        userId: user.id,
      };

      const updatedBuilds = existingIdx >= 0
        ? userBuilds.map((b, i) => (i === existingIdx ? savedBuild : b))
        : [savedBuild, ...userBuilds];

      setUserBuilds(updatedBuilds);
      localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(updatedBuilds));

      await fetch('/api/apps/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedBuild),
      });
    } catch (err) {
      console.error('Save build error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Current App to Community Page
  const handlePublishApp = async (details: {
    title: string;
    description: string;
    tags: string[];
    authorName: string;
  }) => {
    if (!code) {
      alert('Please build an application in the Studio before publishing.');
      return;
    }

    try {
      const pubId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payload: AppBuild = {
        id: pubId,
        title: details.title,
        description: details.description,
        code,
        prompt: messages[messages.length - 1]?.content || '',
        authorName: details.authorName || user.name || 'Anonymous Creator',
        authorEmail: user.email,
        authorAvatar: user.avatar,
        userId: user.id,
        tags: details.tags.length > 0 ? details.tags : ['Web App'],
        createdAt: new Date().toISOString(),
        views: 1,
        likes: 0,
      };

      let publishedApp = payload;
      try {
        const result = await safeFetchJson('/api/apps/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (result && result.app) {
          publishedApp = result.app;
        }
      } catch (apiErr) {
        // Fallback local persistence for static workers.dev
        const existing = JSON.parse(localStorage.getItem('abs_public_apps') || '[]');
        const updatedPublic = [publishedApp, ...existing.filter((a: any) => a.id !== publishedApp.id)];
        localStorage.setItem('abs_public_apps', JSON.stringify(updatedPublic));
      }

      setPublicApps((prev) => {
        const next = [publishedApp, ...prev.filter((a) => a.id !== publishedApp.id)];
        localStorage.setItem('abs_public_apps', JSON.stringify(next));
        return next;
      });

      // Mark in user builds as public and associate publishedAppId
      setUserBuilds((prev) => {
        const updated = prev.map((b) =>
          b.title === details.title
            ? { ...b, isPublic: true, publishedAppId: publishedApp.id }
            : b
        );
        localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(updated));
        return updated;
      });

      // Switch tab to community so user immediately sees their published app!
      setCurrentTab('community');
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  // Remove / Unpublish App from Community Gallery
  const handleUnpublishApp = async (publicAppId: string, buildTitle?: string) => {
    try {
      const res = await fetch(`/api/apps/public/${publicAppId}`, { method: 'DELETE' });
      if (res.ok) {
        // Remove from public apps state
        setPublicApps((prev) => prev.filter((a) => a.id !== publicAppId));

        // Update user builds to no longer be marked public
        setUserBuilds((prev) => {
          const updated = prev.map((b) => {
            if (
              b.publishedAppId === publicAppId ||
              (buildTitle && b.title.toLowerCase() === buildTitle.toLowerCase())
            ) {
              return { ...b, isPublic: false, publishedAppId: undefined };
            }
            return b;
          });
          localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(updated));
          return updated;
        });

        if (runningApp?.id === publicAppId) {
          setRunningApp(null);
        }
      }
    } catch (err) {
      console.error('Unpublish error:', err);
    }
  };

  // Unpublish a build from My Builds
  const handleUnpublishBuild = async (build: AppBuild) => {
    const matchingPublic = publicApps.find(
      (a) =>
        a.id === build.publishedAppId ||
        a.title.toLowerCase() === build.title.toLowerCase()
    );
    const targetId = build.publishedAppId || matchingPublic?.id;
    if (targetId) {
      await handleUnpublishApp(targetId, build.title);
    } else {
      setUserBuilds((prev) => {
        const updated = prev.map((b) => (b.id === build.id ? { ...b, isPublic: false } : b));
        localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Remix App in Studio
  const handleRemixApp = (appToRemix: AppBuild) => {
    setCode(appToRemix.code);
    setAppTitle(`${appToRemix.title} (Remix)`);
    setMessages([
      {
        id: `msg_remix_${Date.now()}`,
        role: 'assistant',
        content: `Loaded "${appToRemix.title}" into Studio for remixing and expansion.`,
        summary: `Original creator: ${appToRemix.authorName}. Prompt the AI to add new features or customize the app.`,
        codeSnapshot: appToRemix.code,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setCurrentTab('builder');
  };

  // Run App in Modal
  const handleRunApp = (appToRun: AppBuild) => {
    setRunningApp(appToRun);
    // Record view
    fetch(`/api/apps/${appToRun.id}/view`, { method: 'POST' }).catch(() => {});
  };

  // Open Build from My Builds
  const handleOpenBuild = (b: AppBuild) => {
    setCode(b.code);
    setAppTitle(b.title);
    setMessages([
      {
        id: `msg_load_${Date.now()}`,
        role: 'assistant',
        content: `Resumed build "${b.title}".`,
        summary: b.description || 'Ready for further iterations.',
        codeSnapshot: b.code,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setCurrentTab('builder');
  };

  // Delete Build
  const handleDeleteBuild = async (id: string) => {
    const target = userBuilds.find((b) => b.id === id);
    if (target && target.isPublic) {
      const matchingPublic = publicApps.find(
        (a) =>
          a.id === target.publishedAppId ||
          a.title.toLowerCase() === target.title.toLowerCase()
      );
      if (matchingPublic) {
        fetch(`/api/apps/public/${matchingPublic.id}`, { method: 'DELETE' }).catch(() => {});
        setPublicApps((prev) => prev.filter((a) => a.id !== matchingPublic.id));
      }
    }
    fetch(`/api/apps/save/${id}`, { method: 'DELETE' }).catch(() => {});
    const updated = userBuilds.filter((b) => b.id !== id);
    setUserBuilds(updated);
    localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(updated));
  };

  // Check if current app in builder is already published
  const currentPublishedApp = publicApps.find(
    (a) =>
      a.title.toLowerCase() === appTitle.toLowerCase() ||
      userBuilds.find((b) => b.title.toLowerCase() === appTitle.toLowerCase())
        ?.publishedAppId === a.id
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181818] text-[#f3f3f3]">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        appTitle={appTitle}
        onRenameTitle={setAppTitle}
        onPublishClick={() => {
          if (!code) {
            alert('Please create an application in the Studio first before publishing.');
            return;
          }
          setIsPublishOpen(true);
        }}
        onSaveClick={handleSaveBuild}
        isSaving={isSaving}
        user={user}
        onOpenSignIn={() => setIsSignInOpen(true)}
        publicAppsCount={publicApps.length}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main Viewport Router */}
      <main className="flex-1 flex overflow-hidden">
        {currentTab === 'builder' && (
          <StudioWorkspace
            code={code}
            onCodeChange={setCode}
            appTitle={appTitle}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            messages={messages}
            onRollbackCode={(snapshot) => setCode(snapshot)}
            suggestedPrompts={suggestedPrompts}
          />
        )}

        {currentTab === 'community' && (
          <CommunityExplore
            publicApps={publicApps}
            onRunApp={handleRunApp}
            onRemixApp={handleRemixApp}
            onRemovePublicApp={handleUnpublishApp}
            currentUser={user}
            onGoToStudio={() => setCurrentTab('builder')}
            isLoading={isLoadingPublic}
          />
        )}

        {currentTab === 'my-builds' && (
          <MyBuilds
            builds={userBuilds}
            onOpenBuild={handleOpenBuild}
            onDeleteBuild={handleDeleteBuild}
            onPublishBuild={(b) => {
              setCode(b.code);
              setAppTitle(b.title);
              setIsPublishOpen(true);
            }}
            onUnpublishBuild={handleUnpublishBuild}
            onNewBuild={() => {
              setCode('');
              setAppTitle('Untitled Application');
              setMessages([]);
              setCurrentTab('builder');
            }}
          />
        )}
      </main>

      {/* Windows 11 Bottom Status Bar */}
      <StatusBar
        hasApiKey={hasApiKey}
        codeLength={code.length}
        publicAppsCount={publicApps.length}
        isGenerating={isGenerating}
      />

      {/* Publish Modal */}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onPublish={handlePublishApp}
        onUnpublish={
          currentPublishedApp
            ? async () => {
                await handleUnpublishApp(currentPublishedApp.id, currentPublishedApp.title);
              }
            : undefined
        }
        isAlreadyPublished={Boolean(currentPublishedApp)}
        initialTitle={appTitle}
        user={user}
        isPublishing={isSaving}
      />

      {/* Sign In / Profile Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        user={user}
        onSaveProfile={handleSaveProfile}
      />

      {/* Full App Runner Modal */}
      <AppRunnerModal
        app={runningApp}
        isOpen={Boolean(runningApp)}
        onClose={() => setRunningApp(null)}
        onRemix={handleRemixApp}
        onRemove={handleUnpublishApp}
        canRemove={Boolean(
          runningApp &&
            (runningApp.userId === user.id ||
              runningApp.authorEmail === user.email ||
              runningApp.authorName === user.name ||
              !runningApp.userId)
        )}
      />

      {/* Gemini AI Key & Engine Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}
