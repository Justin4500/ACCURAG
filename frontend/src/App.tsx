import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { WelcomeScreen } from './components/dashboard/WelcomeScreen';
import { ChatInterface } from './components/chat/ChatInterface';
import { ChatInput, AttachedFileState } from './components/chat/ChatInput';
import { DocumentManager } from './components/documents/DocumentManager';
import { CollectionManager } from './components/collections/CollectionManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { SettingsView } from './components/settings/SettingsView';
import { AuthPage } from './components/auth/AuthPage';

import {
  ConversationItem,
  ConversationDetail,
  DocumentItem,
  CollectionItem,
  AnalyticsData,
  CitationItem,
} from './types';
import { chatService } from './services/chatService';
import { documentService } from './services/documentService';
import { collectionService } from './services/collectionService';
import { analyticsService } from './services/analyticsService';

const MainApplication: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'documents' | 'collections' | 'analytics' | 'settings'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Data states
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [activeConversationDetail, setActiveConversationDetail] = useState<ConversationDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>(undefined);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Loading & Streaming states
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<CitationItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Thinking...');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial user data
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      loadDocuments();
      loadCollections();
    }
  }, [isAuthenticated]);

  // Load analytics whenever switching to analytics tab
  useEffect(() => {
    if (isAuthenticated && activeView === 'analytics') {
      loadAnalytics();
    }
  }, [activeView, isAuthenticated]);

  // Polling for processing documents
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing' || d.status === 'uploaded');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const loadConversations = async () => {
    try {
      const data = await chatService.listConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await documentService.listDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  };

  const loadCollections = async () => {
    try {
      const data = await collectionService.listCollections();
      setCollections(data);
    } catch (err) {
      console.error('Failed to load collections', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoadingAnalytics(true);
      const data = await analyticsService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      setActiveConversationId(id);
      setIsLoadingMessages(true);
      const detail = await chatService.getConversation(id);
      setActiveConversationDetail(detail);
      if (detail.collection_id) {
        setSelectedCollectionId(detail.collection_id);
      }
      setActiveView('chat');
    } catch (err) {
      console.error('Failed to load conversation details', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setActiveConversationDetail(null);
    setActiveView('dashboard');
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await chatService.updateConversation(id, newTitle);
      loadConversations();
      if (activeConversationDetail && activeConversationDetail.id === id) {
        setActiveConversationDetail({ ...activeConversationDetail, title: newTitle });
      }
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await chatService.deleteConversation(id);
      loadConversations();
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const [attachedFiles, setAttachedFiles] = useState<AttachedFileState[]>([]);

  const handleAttachFiles = async (files: File[]) => {
    const newItems: AttachedFileState[] = files.map((file) => ({
      file,
      id: `attach-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as const,
    }));

    setAttachedFiles((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const uploadedDocs = await documentService.uploadDocuments([item.file]);
        const uploadedDocId = uploadedDocs?.[0]?.id;
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: 'ready' as const, documentId: uploadedDocId }
              : f
          )
        );
        await loadDocuments();
      } catch (err: any) {
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'error' as const,
                  errorMessage: err.response?.data?.detail || err.message || 'Upload failed',
                }
              : f
          )
        );
      }
    }
  };

  const handleRemoveAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUploadFiles = async (files: File[]) => {
    try {
      setIsUploading(true);
      await documentService.uploadDocuments(files);
      await loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isSending || isStreaming) return;

    // Switch view to chat if on dashboard
    if (activeView !== 'chat') {
      setActiveView('chat');
    }

    const targetDocIds = attachedFiles
      .map((f) => f.documentId)
      .filter((id): id is string => Boolean(id));

    setAttachedFiles([]);
    setIsSending(true);
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingCitations([]);

    // Optimistically add user message to UI
    const tempUserMsg = {
      id: `temp-user-${Date.now()}`,
      conversation_id: activeConversationId || 'pending',
      role: 'user' as const,
      content: query,
      created_at: new Date().toISOString(),
    };

    setActiveConversationDetail((prev) => {
      const existing = prev ? prev.messages : [];
      return {
        id: prev ? prev.id : 'pending',
        title: prev ? prev.title : query.slice(0, 30),
        collection_id: selectedCollectionId,
        messages: [...existing, tempUserMsg],
        created_at: prev ? prev.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await chatService.streamRag(
      query,
      activeConversationId,
      selectedCollectionId,
      targetDocIds.length > 0 ? targetDocIds : undefined,
      {
        onStatus: (status) => {
          setStatusMessage(status);
        },
        onCitations: (citations) => {
          setStreamingCitations(citations);
        },
        onChunk: (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        onDone: async (info) => {
          setIsStreaming(false);
          setIsSending(false);
          setActiveConversationId(info.conversation_id);
          // Refresh conversation detail from backend to synchronize exact messages & IDs
          const refreshed = await chatService.getConversation(info.conversation_id);
          setActiveConversationDetail(refreshed);
          loadConversations();
        },
        onError: (error) => {
          console.error('Stream error:', error);
          setStreamingContent((prev) => prev + `\n\n[Generation error: ${error}]`);
          setIsStreaming(false);
          setIsSending(false);
        },
      },
      abortController.signal
    );
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsSending(false);
    }
  };

  const handleChatWithCollection = (colId: string) => {
    setSelectedCollectionId(colId);
    handleNewChat();
    setActiveView('chat');
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0d0f17] flex items-center justify-center text-slate-400 text-sm">
        Initializing Accurate AI...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const activeCollectionObj = collections.find((c) => c.id === selectedCollectionId);

  return (
    <div className="flex h-screen bg-[#0d0f17] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        activeView={activeView === 'dashboard' ? 'chat' : activeView}
        setActiveView={(view) => {
          if (view === 'chat' && !activeConversationId) {
            setActiveView('dashboard');
          } else {
            setActiveView(view);
          }
        }}
        documentCount={documents.length}
        collectionCount={collections.length}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={
            activeView === 'documents'
              ? 'Documents'
              : activeView === 'collections'
              ? 'Collections'
              : activeView === 'analytics'
              ? 'Analytics'
              : activeView === 'settings'
              ? 'Settings'
              : activeConversationDetail?.title || 'Accurate AI Workspace'
          }
          subtitle={
            activeView === 'chat' || activeView === 'dashboard'
              ? activeCollectionObj
                ? `Scoped to ${activeCollectionObj.name}`
                : 'All Documents'
              : undefined
          }
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={(id) => setSelectedCollectionId(id)}
          onNewChat={handleNewChat}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#131314]">
          {activeView === 'dashboard' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#131314]">
              <WelcomeScreen
                onSelectSuggestedPrompt={(prompt) => {
                  handleSendMessage(prompt);
                }}
                onUploadFiles={handleAttachFiles}
                isUploading={isUploading || attachedFiles.some((f) => f.status === 'uploading')}
                recentDocuments={documents}
                recentConversations={conversations}
                onSelectConversation={handleSelectConversation}
                onViewDocuments={() => setActiveView('documents')}
              />
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isSending}
                isStreaming={false}
                onStopStreaming={handleStopStreaming}
                onUploadFile={(file) => handleAttachFiles([file])}
                attachedFiles={attachedFiles}
                onRemoveAttachedFile={handleRemoveAttachedFile}
                onAttachFiles={handleAttachFiles}
                placeholder={
                  activeCollectionObj
                    ? `Ask a question within "${activeCollectionObj.name}"...`
                    : 'Ask Accurate AI anything about your documents...'
                }
              />
            </div>
          )}

          {activeView === 'chat' && (
            <ChatInterface
              messages={activeConversationDetail?.messages || []}
              isLoading={isSending}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              streamingCitations={streamingCitations}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onRegenerateAnswer={() => {
                const msgs = activeConversationDetail?.messages || [];
                const lastUserMsg = [...msgs].reverse().find((m) => m.role === 'user');
                if (lastUserMsg) {
                  handleSendMessage(lastUserMsg.content);
                }
              }}
              onUploadFile={(file) => handleAttachFiles([file])}
              attachedFiles={attachedFiles}
              onRemoveAttachedFile={handleRemoveAttachedFile}
              onAttachFiles={handleAttachFiles}
              statusMessage={statusMessage}
              conversationTitle={activeConversationDetail?.title}
              collectionName={activeCollectionObj?.name}
            />
          )}

          {activeView === 'documents' && (
            <DocumentManager
              documents={documents}
              onRefresh={loadDocuments}
              onUpload={handleUploadFiles}
              isUploading={isUploading}
            />
          )}

          {activeView === 'collections' && (
            <CollectionManager
              collections={collections}
              availableDocuments={documents}
              onRefresh={loadCollections}
              onChatWithCollection={handleChatWithCollection}
            />
          )}

          {activeView === 'analytics' && (
            <AnalyticsDashboard analytics={analytics} isLoading={isLoadingAnalytics} />
          )}

          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApplication />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
