import React from 'react';
import { Menu, Sparkles, Folder, Layers, Plus } from 'lucide-react';
import { CollectionItem } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  title: string;
  subtitle?: string;
  collections: CollectionItem[];
  selectedCollectionId?: string;
  onSelectCollection: (id?: string) => void;
  onNewChat: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  title,
  subtitle,
  collections,
  selectedCollectionId,
  onSelectCollection,
  onNewChat,
}) => {
  return (
    <header className="h-14 border-b border-[#2d2f31] bg-[#131314]/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1a1e2d] transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="truncate">
          <h2 className="text-sm font-semibold text-slate-100 truncate flex items-center gap-2">
            <span>{title}</span>
            {subtitle && (
              <span className="text-xs font-normal text-slate-500 hidden sm:inline">
                • {subtitle}
              </span>
            )}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Collection Selector / Scope */}
        <div className="flex items-center gap-1.5 bg-[#161925] border border-[#232738] rounded-xl px-2.5 py-1 text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <select
            value={selectedCollectionId || ''}
            onChange={(e) => onSelectCollection(e.target.value ? e.target.value : undefined)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-[#161925] text-slate-300">
              All Documents
            </option>
            {collections.map((col) => (
              <option key={col.id} value={col.id} className="bg-[#161925] text-slate-300">
                Collection: {col.name} ({col.document_count})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition-colors cursor-pointer"
          title="New Chat"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>
    </header>
  );
};
