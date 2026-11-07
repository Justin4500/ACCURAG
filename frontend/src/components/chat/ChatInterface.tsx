import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, UploadCloud, FileText } from 'lucide-react';
import { ChatMessageItem, CitationItem } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput, AttachedFileState } from './ChatInput';

interface ChatInterfaceProps {
  messages: ChatMessageItem[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  streamingCitations: CitationItem[];
  onSendMessage: (query: string, attachedFileIds?: string[]) => void;
  onStopStreaming: () => void;
  onRegenerateAnswer?: () => void;
  onUploadFile?: (file: File) => Promise<any> | void;
  conversationTitle?: string;
  collectionName?: string;
  attachedFiles?: AttachedFileState[];
  onRemoveAttachedFile?: (id: string) => void;
  onAttachFiles?: (files: File[]) => void;
  statusMessage?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  isStreaming,
  streamingContent,
  streamingCitations,
  onSendMessage,
  onStopStreaming,
  onRegenerateAnswer,
  onUploadFile,
  conversationTitle,
  collectionName,
  attachedFiles = [],
  onRemoveAttachedFile,
  onAttachFiles,
  statusMessage,
}) => {
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom(isStreaming ? 'auto' : 'smooth');
  }, [messages, streamingContent, isStreaming]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWindowDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWindowDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWindowDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (onAttachFiles) {
        onAttachFiles(filesArray);
      } else if (onUploadFile) {
        filesArray.forEach((f) => onUploadFile(f));
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex flex-col min-h-0 overflow-hidden bg-[#131314]"
    >
      {/* Full Area Drag-and-drop overlay */}
      {isWindowDragOver && (
        <div className="absolute inset-0 z-50 bg-[#131314]/90 backdrop-blur-sm border-2 border-dashed border-blue-500 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-3 shadow-lg">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          <p className="text-lg font-semibold text-slate-100">Drop your documents here</p>
          <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT, or CSV will be indexed automatically</p>
        </div>
      )}

      {/* Scrollable messages container */}
      <div className="flex-1 overflow-y-auto">
        {/* Welcome message if no conversation yet */}
        {messages.length === 0 && !isStreaming && (
          <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] to-[#EA4335] p-[2px] shadow-xl shadow-purple-500/10">
              <div className="w-full h-full rounded-full bg-[#1e1f20] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-cyan-300" />
              </div>
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-slate-100">
              Accurate AI Document Assistant
            </h3>

            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Upload documents or click the <span className="font-semibold text-slate-200">+</span> button below to attach files. Ask questions to get answers verified against your documents with page citations.
            </p>

            {collectionName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                <span>Active Scope: Collection "{collectionName}"</span>
              </div>
            )}
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((msg, index) => (
          <ChatMessage
            key={msg.id || index}
            message={msg}
            onRegenerate={
              index === messages.length - 1 && msg.role === 'assistant'
                ? onRegenerateAnswer
                : undefined
            }
          />
        ))}

        {/* Streaming Assistant Message */}
        {isStreaming && (
          <ChatMessage
            message={{
              id: 'streaming-active',
              conversation_id: 'temp',
              role: 'assistant',
              content: streamingContent,
              citations: streamingCitations,
              created_at: new Date().toISOString(),
            }}
            isStreaming={true}
            statusMessage={statusMessage || 'Thinking...'}
          />
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Floating Gemini Chat Input at the bottom */}
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        isStreaming={isStreaming}
        onStopStreaming={onStopStreaming}
        onUploadFile={onUploadFile}
        attachedFiles={attachedFiles}
        onRemoveAttachedFile={onRemoveAttachedFile}
        onAttachFiles={onAttachFiles}
        placeholder={
          collectionName
            ? `Ask a question within "${collectionName}"...`
            : 'Ask Accurate AI anything about your documents...'
        }
      />
    </div>
  );
};
