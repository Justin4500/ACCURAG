import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { DocumentItem, ConversationItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface WelcomeScreenProps {
  onSelectSuggestedPrompt: (prompt: string) => void;
  onUploadFiles: (files: File[]) => void;
  isUploading: boolean;
  recentDocuments: DocumentItem[];
  recentConversations: ConversationItem[];
  onSelectConversation: (id: string) => void;
  onViewDocuments: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectSuggestedPrompt,
  onUploadFiles,
  isUploading,
  recentDocuments,
  recentConversations,
  onSelectConversation,
  onViewDocuments,
}) => {
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'there';

  const suggestedQuestions = [
    {
      title: 'Summarize Key Findings',
      prompt: 'Provide a structured summary of the main points, conclusions, and findings across my uploaded documents.',
      badge: 'Summary',
    },
    {
      title: 'Extract Financial Metrics & Dates',
      prompt: 'List all specific figures, revenues, dates, milestones, and quantitative metrics mentioned in the documents.',
      badge: 'Data',
    },
    {
      title: 'Check Compliance & Policies',
      prompt: 'What are the required compliance criteria, conditions, or regulatory obligations stated in these documents?',
      badge: 'Compliance',
    },
    {
      title: 'Compare Statements & Discrepancies',
      prompt: 'Compare the different sections or statements found within the files and highlight any discrepancies.',
      badge: 'Analysis',
    },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const getDocIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-400" />;
    if (ext === 'csv') return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    return <FileCode className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 md:py-14 md:px-8 bg-[#131314]">
      <div className="max-w-4xl mx-auto space-y-9">
        {/* Google Gemini Hero Greeting */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#d96570]">
              Hello, {firstName}
            </span>
          </h1>
          <p className="text-2xl md:text-3xl text-slate-400 font-normal">
            How can I help you understand your documents today?
          </p>
        </div>

        {/* Large Drag-and-Drop Document Upload Area (Gemini Style) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-3xl border-2 border-dashed p-8 md:p-10 text-center transition-all duration-200 cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-500/10 scale-[1.01] ring-4 ring-blue-500/20'
              : 'border-[#3c4043]/60 bg-[#1e1f20] hover:border-[#5a5f67] hover:bg-[#25272a]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFiles(Array.from(e.target.files));
                e.target.value = '';
              }
            }}
            multiple
            accept=".pdf,.docx,.txt,.md,.csv"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#282a2d] border border-[#3c4043] flex items-center justify-center text-blue-400 shadow-md">
              {isUploading ? (
                <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>

            <div>
              <p className="text-base font-semibold text-slate-100">
                {isUploading ? 'Processing and embedding documents...' : 'Upload documents to start chatting'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Drag and drop PDF, DOCX, TXT, Markdown, or CSV files here, or click to browse. Accurate AI indexes text and preserves page citations.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-[#2d2f31]">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Page-level index
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Strict anti-hallucination
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Grounded citations
              </span>
            </div>
          </div>
        </div>

        {/* Recently Uploaded Documents Chips (if any) */}
        {recentDocuments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ready Documents ({recentDocuments.length})
              </span>
              <button
                onClick={onViewDocuments}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                Manage all
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {recentDocuments.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onSelectSuggestedPrompt(`What are the key points in ${doc.file_name}?`)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#1e1f20] border border-[#3c4043]/60 hover:border-[#52575e] hover:bg-[#282a2d] transition-all cursor-pointer group shadow-sm"
                  title={`Ask about ${doc.file_name}`}
                >
                  {getDocIcon(doc.file_name)}
                  <span className="text-xs font-medium text-slate-200 group-hover:text-blue-300 transition-colors truncate max-w-[200px]">
                    {doc.file_name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                    {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gemini-Style Suggested Question Cards */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Suggested Prompts
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedQuestions.map((item, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestedPrompt(item.prompt)}
                className="flex flex-col text-left p-4 rounded-2xl bg-[#1e1f20] border border-[#3c4043]/60 hover:border-[#52575e] hover:bg-[#282a2d] transition-all duration-200 cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-medium text-blue-400 group-hover:text-blue-300">
                    {item.badge}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
