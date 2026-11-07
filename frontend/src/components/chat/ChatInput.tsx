import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Plus,
  Loader2,
  FileText,
  X,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
} from 'lucide-react';

export interface AttachedFileState {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  documentId?: string;
}

interface ChatInputProps {
  onSendMessage: (text: string, attachedFileIds?: string[]) => void;
  isLoading: boolean;
  isStreaming: boolean;
  onStopStreaming: () => void;
  onUploadFile?: (file: File) => Promise<any> | void;
  placeholder?: string;
  attachedFiles?: AttachedFileState[];
  onRemoveAttachedFile?: (id: string) => void;
  onAttachFiles?: (files: File[]) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  isStreaming,
  onStopStreaming,
  onUploadFile,
  placeholder = 'Ask Accurate AI anything about your documents...',
  attachedFiles = [],
  onRemoveAttachedFile,
  onAttachFiles,
}) => {
  const [input, setInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || isStreaming) return;

    // Check if any attached files are still uploading
    const stillUploading = attachedFiles.some((f) => f.status === 'uploading');
    if (stillUploading) return;

    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (onAttachFiles) {
        onAttachFiles(filesArray);
      } else if (onUploadFile) {
        filesArray.forEach((f) => onUploadFile(f));
      }
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (onAttachFiles) {
        onAttachFiles(filesArray);
      } else if (onUploadFile) {
        filesArray.forEach((f) => onUploadFile(f));
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-400" />;
    if (ext === 'csv') return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (ext === 'md' || ext === 'txt') return <FileCode className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-blue-400" />;
  };

  const isUploadingFiles = attachedFiles.some((f) => f.status === 'uploading');
  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && !isLoading && !isUploadingFiles;

  return (
    <div className="w-full bg-[#131314] px-4 py-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-[26px] bg-[#1e1f20] border transition-all duration-200 shadow-2xl ${
            isDragOver
              ? 'border-blue-500 bg-[#282a2d] ring-2 ring-blue-500/30'
              : 'border-[#3c4043]/60 hover:border-[#52575e] focus-within:border-[#7c828d]'
          }`}
        >
          {/* Attached Files Chips Container (Google Gemini Style) */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 pb-0 border-b border-[#2d2f31]">
              {attachedFiles.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#282a2d] border border-[#3c4043] text-xs text-slate-200 shadow-sm animate-in fade-in zoom-in duration-150"
                >
                  <div className="shrink-0">{getFileIcon(item.name)}</div>
                  <div className="flex flex-col min-w-0 max-w-[180px]">
                    <span className="truncate font-medium text-[12px]">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{formatSize(item.size)}</span>
                  </div>

                  {item.status === 'uploading' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                  )}
                  {item.status === 'ready' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  {item.status === 'error' && (
                    <span title={item.errorMessage || 'Upload failed'}>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    </span>
                  )}

                  {onRemoveAttachedFile && (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachedFile(item.id)}
                      className="p-0.5 rounded-full hover:bg-[#3c4043] text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Main prompt input row */}
          <div className="flex items-end gap-2 px-4 py-2.5">
            {/* Plus / Add Files Button (Gemini Style) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt,.md,.csv"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isStreaming}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2d2f31] transition-all cursor-pointer shrink-0 disabled:opacity-40 mb-0.5"
              title="Add documents or files (PDF, DOCX, TXT, CSV)"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Seamless textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading && !isStreaming}
              className="flex-1 bg-transparent py-2 text-[14px] text-slate-100 placeholder-slate-400 focus:outline-none resize-none leading-relaxed max-h-[180px] scrollbar-thin"
            />

            {/* Send / Stop Generation Button (Gemini Style Circle Button) */}
            <div className="shrink-0 mb-0.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                  title="Stop generation"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                    canSend
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 cursor-pointer scale-100 hover:scale-105 active:scale-95'
                      : 'bg-[#282a2d] text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                  title={isUploadingFiles ? 'Uploading document...' : 'Send message (Enter)'}
                >
                  {isLoading || isUploadingFiles ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                  ) : (
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between mt-2.5 px-3 text-[11px] text-slate-500">
          <span>Accurate AI delivers grounded answers with page-level citations</span>
          <span>Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
