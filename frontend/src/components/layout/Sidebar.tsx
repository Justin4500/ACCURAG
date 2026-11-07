import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Files,
  FolderOpen,
  BarChart3,
  Settings,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  Sparkles,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { ConversationItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
  conversations: ConversationItem[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  activeView: 'chat' | 'documents' | 'collections' | 'analytics' | 'settings';
  setActiveView: (view: 'chat' | 'documents' | 'collections' | 'analytics' | 'settings') => void;
  documentCount: number;
  collectionCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  activeView,
  setActiveView,
  documentCount,
  collectionCount,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Group conversations into Today, Yesterday, Previous 7 Days, and Older
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: { [key: string]: ConversationItem[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filtered.forEach((conv) => {
      const convTime = new Date(conv.updated_at || conv.created_at).getTime();
      if (convTime >= today) {
        groups.Today.push(conv);
      } else if (convTime >= yesterday) {
        groups.Yesterday.push(conv);
      } else if (convTime >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  }, [conversations, searchQuery]);

  const handleStartRename = (conv: ConversationItem) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#18191b] border-r border-[#2d2f31] transition-all duration-300 z-20 ${
        isCollapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2d2f31] h-16 shrink-0">
        {!isCollapsed && (
          <div
            onClick={onNewChat}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] to-[#EA4335] p-[1.5px] shadow-sm">
              <div className="w-full h-full rounded-full bg-[#1e1f20] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </div>
            </div>
            <div>
              <span className="font-bold text-sm text-slate-100 tracking-wide">Accurate AI</span>
              <span className="block text-[10px] text-blue-400 font-medium">Grounded RAG</span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] to-[#EA4335] p-[1.5px]">
            <div className="w-full h-full rounded-full bg-[#1e1f20] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#282a2d] transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat Button (Google Gemini Style Pill) */}
      <div className="p-3 shrink-0">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2.5 rounded-full bg-[#282a2d] hover:bg-[#333538] border border-[#3c4043] text-slate-200 hover:text-white font-medium text-xs py-2.5 transition-all shadow-sm cursor-pointer ${
            isCollapsed ? 'px-0' : 'px-4'
          }`}
          title="Start New Chat"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          {!isCollapsed && <span>New chat</span>}
        </button>
      </div>

      {/* Search Bar (only when expanded) */}
      {!isCollapsed && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161925] border border-[#232738] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      )}

      {/* Conversation List (collapsible scroll area) */}
      {!isCollapsed ? (
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
          {Object.entries(groupedConversations).map(([groupName, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupName} className="space-y-1">
                <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {groupName}
                </span>

                <div className="space-y-0.5">
                  {items.map((conv) => {
                    const isActive = activeConversationId === conv.id && activeView === 'chat';
                    const isEditing = editingId === conv.id;

                    return (
                      <div
                        key={conv.id}
                        className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#1e2335] text-slate-100 font-medium'
                            : 'text-slate-400 hover:bg-[#151926] hover:text-slate-200'
                        }`}
                        onClick={() => {
                          if (!isEditing) {
                            setActiveView('chat');
                            onSelectConversation(conv.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-blue-400" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleSaveRename(conv.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(conv.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="bg-[#24283b] text-white px-2 py-0.5 rounded text-xs w-full focus:outline-none"
                            />
                          ) : (
                            <span className="truncate">{conv.title}</span>
                          )}
                        </div>

                        {/* Inline Actions Menu */}
                        {!isEditing && (
                          <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                              }}
                              className="p-1 rounded hover:bg-[#282d42] text-slate-400 hover:text-slate-200"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>

                            {menuOpenId === conv.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-6 w-32 rounded-lg bg-[#1a1e2d] border border-[#2c3246] shadow-xl py-1 z-30"
                              >
                                <button
                                  onClick={() => handleStartRename(conv)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-[#252a3f]"
                                >
                                  <Edit2 className="w-3 h-3" /> Rename
                                </button>
                                <button
                                  onClick={() => {
                                    onDeleteConversation(conv.id);
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {conversations.length === 0 && (
            <div className="text-center py-6 px-3 text-xs text-slate-500">
              No conversations yet. Start by asking a question!
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Navigation Sections */}
      <div className="p-2 border-t border-[#1e2230] space-y-1 shrink-0">
        <button
          onClick={() => setActiveView('documents')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
            activeView === 'documents'
              ? 'bg-[#1e2335] text-blue-400 font-semibold'
              : 'text-slate-400 hover:bg-[#151926] hover:text-slate-200'
          }`}
          title="Documents"
        >
          <Files className="w-4 h-4 shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span>Documents</span>
              <span className="px-1.5 py-0.2 rounded bg-[#202538] text-[10px] text-slate-400">
                {documentCount}
              </span>
            </div>
          )}
        </button>

        <button
          onClick={() => setActiveView('collections')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
            activeView === 'collections'
              ? 'bg-[#1e2335] text-blue-400 font-semibold'
              : 'text-slate-400 hover:bg-[#151926] hover:text-slate-200'
          }`}
          title="Collections"
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span>Collections</span>
              <span className="px-1.5 py-0.2 rounded bg-[#202538] text-[10px] text-slate-400">
                {collectionCount}
              </span>
            </div>
          )}
        </button>

        <button
          onClick={() => setActiveView('analytics')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
            activeView === 'analytics'
              ? 'bg-[#1e2335] text-blue-400 font-semibold'
              : 'text-slate-400 hover:bg-[#151926] hover:text-slate-200'
          }`}
          title="Analytics"
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Analytics</span>}
        </button>

        <button
          onClick={() => setActiveView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
            activeView === 'settings'
              ? 'bg-[#1e2335] text-blue-400 font-semibold'
              : 'text-slate-400 hover:bg-[#151926] hover:text-slate-200'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-[#1e2230] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {user?.full_name || 'Accurate User'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
                  setTheme(nextTheme);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1f2434] transition-colors cursor-pointer"
                title={`Theme: ${theme}`}
              >
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Laptop className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={logout}
                className="px-2 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                title="Switch Google Account"
              >
                Switch
              </button>

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
