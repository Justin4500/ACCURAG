import React, { useState } from 'react';
import {
  FolderPlus,
  Folder,
  Trash2,
  Edit2,
  MessageSquare,
  FileText,
  Plus,
  X,
  Check,
  Layers,
} from 'lucide-react';
import { CollectionItem, DocumentItem } from '../../types';
import { collectionService } from '../../services/collectionService';

interface CollectionManagerProps {
  collections: CollectionItem[];
  availableDocuments: DocumentItem[];
  onRefresh: () => void;
  onChatWithCollection: (collectionId: string) => void;
}

export const CollectionManager: React.FC<CollectionManagerProps> = ({
  collections,
  availableDocuments,
  onRefresh,
  onChatWithCollection,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [managingDocCol, setManagingDocCol] = useState<CollectionItem | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    try {
      await collectionService.createCollection(newColName.trim(), newColDesc.trim() || undefined);
      setNewColName('');
      setNewColDesc('');
      setIsCreating(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to create collection', err);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await collectionService.updateCollection(id, editName.trim());
      setEditingId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update collection', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this collection? Documents will not be deleted.')) return;
    try {
      await collectionService.deleteCollection(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete collection', err);
    }
  };

  const handleToggleDocInCollection = async (docId: string, isInCollection: boolean) => {
    if (!managingDocCol) return;
    try {
      if (isInCollection) {
        await collectionService.removeDocument(managingDocCol.id, docId);
      } else {
        await collectionService.addDocuments(managingDocCol.id, [docId]);
      }
      const updated = await collectionService.getCollection(managingDocCol.id);
      setManagingDocCol(updated);
      onRefresh();
    } catch (err) {
      console.error('Failed to update collection documents', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Document Collections</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Group related documents by project, department, or topic to scope AI queries specifically to them.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start md:self-auto shrink-0"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Create Modal / Inline Form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-blue-500/30 bg-[#161a29] p-4 space-y-3 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-400" />
              <span>Create New Collection</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Collection Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Legal Contracts 2026, Financial Reports"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="w-full bg-[#11131c] border border-[#232738] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief purpose of this document collection"
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                className="w-full bg-[#11131c] border border-[#232738] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-xl border border-[#282d42] text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((col) => {
          const isEditing = editingId === col.id;

          return (
            <div
              key={col.id}
              className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-4 hover:border-[#2d3348] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Folder className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(col.id);
                        setEditName(col.name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-[#1f2436] cursor-pointer"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(col.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer"
                      title="Delete collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-[#1c2032] border border-blue-500 rounded px-2 py-1 text-xs text-white w-full"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(col.id)}
                      className="p-1 bg-blue-600 text-white rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-sm text-slate-100">{col.name}</h3>
                    {col.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {col.description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-[#1c2030]">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    {col.document_count} Documents
                  </span>
                  <button
                    onClick={() => setManagingDocCol(col)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    Manage docs
                  </button>
                </div>

                <button
                  onClick={() => onChatWithCollection(col.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1b2032] hover:bg-blue-600 hover:text-white border border-[#272d44] text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat with this Collection</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {collections.length === 0 && !isCreating && (
        <div className="text-center py-12 rounded-xl border border-dashed border-[#232738] bg-[#141724]/30 space-y-3">
          <Folder className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No Collections Created</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Organize multiple documents into collections to focus your answers on specific topics.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
          >
            Create Your First Collection
          </button>
        </div>
      )}

      {/* Manage Documents in Collection Modal */}
      {managingDocCol && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl border border-[#24293c] bg-[#131622] p-6 max-w-xl w-full max-h-[80vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Manage Collection: {managingDocCol.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select which documents belong to this collection.
                </p>
              </div>
              <button
                onClick={() => setManagingDocCol(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {availableDocuments.map((doc) => {
                const isSelected = managingDocCol.documents.some((d) => d.id === doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleToggleDocInCollection(doc.id, isSelected)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'border-blue-500/40 bg-blue-500/10 text-slate-100'
                        : 'border-[#202538] bg-[#161a29] text-slate-400 hover:bg-[#1a1f30]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <FileText className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="font-medium truncate">{doc.file_name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-500">{doc.page_count} pages</span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-[#2d3348]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {availableDocuments.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  No documents available. Upload documents first.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1e2230]">
              <button
                onClick={() => setManagingDocCol(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
