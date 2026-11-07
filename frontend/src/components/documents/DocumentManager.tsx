import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import { DocumentItem } from '../../types';
import { documentService } from '../../services/documentService';

interface DocumentManagerProps {
  documents: DocumentItem[];
  onRefresh: () => void;
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onRefresh,
  onUpload,
  isUploading,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRetry = async (docId: string) => {
    try {
      setRetryingId(docId);
      await documentService.retryDocument(docId);
      onRefresh();
    } catch (err) {
      console.error('Failed to retry document', err);
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document and its indexed vectors?')) return;
    try {
      setDeletingId(docId);
      await documentService.deleteDocument(docId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete document', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    const t = fileType.toLowerCase();
    if (t === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (t === 'docx') return <FileText className="w-4 h-4 text-blue-400" />;
    if (t === 'csv') return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    return <FileCode className="w-4 h-4 text-slate-400" />;
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.file_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.file_type.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
      {/* Top Banner & Upload Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Document Management</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Index and manage PDFs, Word documents, CSV, and text files for high-precision semantic retrieval.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start md:self-auto shrink-0"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          <span>Upload Documents</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUpload(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
          multiple
          accept=".pdf,.docx,.txt,.md,.csv"
          className="hidden"
        />
      </div>

      {/* Drag-and-drop mini zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(Array.from(e.dataTransfer.files));
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-xl border border-dashed p-4 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-[#262b3e] bg-[#141724]/40 hover:bg-[#161a29]'
        }`}
      >
        <p className="text-xs text-slate-400">
          Drag & drop files here to upload instantly (max 50MB per file)
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161925] border border-[#232738] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#161925] border border-[#232738] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All File Types</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="csv">CSV</option>
            <option value="txt">TXT</option>
            <option value="md">Markdown</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#161925] border border-[#232738] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="uploaded">Uploaded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Document Table */}
      <div className="rounded-xl border border-[#1e2230] bg-[#131622] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#171a29] border-b border-[#1e2230] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Pages / Chunks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2030] text-slate-300">
              {filteredDocs.map((doc) => {
                const isRetrying = retryingId === doc.id;
                const isDeleting = deletingId === doc.id;

                return (
                  <tr key={doc.id} className="hover:bg-[#181b2a] transition-colors">
                    {/* Document Name */}
                    <td className="py-3.5 px-4 font-medium flex items-center gap-2.5 max-w-[280px]">
                      {getFileIcon(doc.file_type)}
                      <span className="truncate text-slate-200" title={doc.file_name}>
                        {doc.file_name}
                      </span>
                    </td>

                    {/* File Type */}
                    <td className="py-3.5 px-4 uppercase font-mono text-[11px] text-slate-400">
                      {doc.file_type}
                    </td>

                    {/* File Size */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatFileSize(doc.file_size_bytes)}
                    </td>

                    {/* Pages & Chunks */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {doc.page_count} pages • {doc.chunk_count} chunks
                    </td>

                    {/* Processing Status */}
                    <td className="py-3.5 px-4">
                      {doc.status === 'completed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {doc.status === 'processing' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      )}
                      {doc.status === 'uploaded' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium">
                          <Clock className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                      {doc.status === 'failed' && (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-medium">
                            <AlertTriangle className="w-3 h-3" /> Failed
                          </span>
                          {doc.ocr_required && (
                            <p className="text-[10px] text-amber-400 mt-0.5">
                              Scanned PDF detected (OCR required)
                            </p>
                          )}
                          {doc.error_message && !doc.ocr_required && (
                            <p className="text-[10px] text-red-400 max-w-xs truncate" title={doc.error_message}>
                              {doc.error_message}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(doc.id)}
                            disabled={isRetrying}
                            className="p-1.5 rounded-lg hover:bg-[#202538] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                            title="Retry processing"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No documents found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
