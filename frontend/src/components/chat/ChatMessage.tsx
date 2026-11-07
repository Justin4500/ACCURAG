import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Globe,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  User,
  Quote,
} from 'lucide-react';
import { ChatMessageItem, CitationItem } from '../../types';
import { chatService } from '../../services/chatService';

interface ChatMessageProps {
  message: ChatMessageItem;
  onRegenerate?: () => void;
  isStreaming?: boolean;
  statusMessage?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  isStreaming = false,
  statusMessage,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (rating: number) => {
    try {
      setFeedback(rating);
      await chatService.submitFeedback(message.id, rating);
    } catch (err) {
      console.error('Failed to submit feedback', err);
    }
  };

  // User Message
  if (isUser) {
    return (
      <div className="py-3 px-4 md:px-8 flex justify-end">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="bg-[#18191d] text-zinc-100 rounded-2xl rounded-tr-sm px-5 py-3.5 text-[14.5px] leading-relaxed shadow-sm border border-zinc-800/80 font-sans break-words selection:bg-indigo-600/30">
            {message.content}
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message
  const citations = message.citations || [];
  const hasCitations = citations.length > 0;
  const docCitations = citations.filter(c => c.source_type === 'document' || (!c.source_type && !c.url));
  const webCitations = citations.filter(c => c.source_type === 'web' || !!c.url);

  return (
    <div className="py-4 px-4 md:px-8">
      <div className="max-w-4xl mx-auto flex gap-4 md:gap-5">
        {/* Accurate AI Avatar */}
        <div className="shrink-0 mt-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-zinc-900 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Content & Sources */}
        <div className="flex-1 min-w-0 space-y-3.5">
          {/* Real-time Status Shimmer */}
          {isStreaming && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-xs font-medium text-indigo-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{statusMessage || 'Accurate AI is thinking...'}</span>
            </div>
          )}

          {/* Markdown Content */}
          <div className="prose prose-invert prose-zinc max-w-none text-zinc-100 text-[15px] leading-relaxed break-words font-sans selection:bg-indigo-600/30">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3.5 last:mb-0 leading-relaxed text-zinc-200">{children}</p>,
                code: ({ node, inline, className, children, ...props }: any) => {
                  return inline ? (
                    <code
                      className="px-1.5 py-0.5 rounded-md bg-zinc-800/90 text-cyan-300 font-mono text-xs border border-zinc-700/60"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <div className="relative my-3 rounded-xl overflow-hidden border border-zinc-800 bg-[#121316]">
                      <pre className="p-4 text-xs font-mono overflow-x-auto text-zinc-300">
                        <code>{children}</code>
                      </pre>
                    </div>
                  );
                },
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3.5 space-y-1 text-zinc-200">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3.5 space-y-1 text-zinc-200">{children}</ol>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-indigo-500/80 pl-3.5 my-3 text-zinc-300 italic bg-zinc-900/40 py-1 rounded-r-md">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>

            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1.5 bg-indigo-400 animate-pulse rounded-sm align-middle" />
            )}
          </div>

          {/* ORIGINAL ACCORDION SOURCES SECTION (Clean, Minimal, Expandable) */}
          {hasCitations && !isStreaming && (
            <div className="pt-2">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden transition-all duration-200 shadow-sm">
                {/* Accordion Toggle Bar */}
                <button
                  type="button"
                  onClick={() => setSourcesExpanded(!sourcesExpanded)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-zinc-800/40 transition-colors text-xs font-medium text-zinc-300 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-semibold text-zinc-200 tracking-wide">Sources & Citations</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {citations.length}
                    </span>

                    {docCitations.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                        <FileText className="w-3 h-3" />
                        {docCitations.length} Document{docCitations.length > 1 ? 's' : ''}
                      </span>
                    )}

                    {webCitations.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-950/40 text-sky-400 border border-sky-800/40">
                        <Globe className="w-3 h-3" />
                        {webCitations.length} Web
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0">
                    <span>{sourcesExpanded ? 'Hide' : 'Show details'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        sourcesExpanded ? 'rotate-180 text-zinc-200' : 'text-zinc-500'
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Sources Grid */}
                {sourcesExpanded && (
                  <div className="p-4 border-t border-zinc-800/80 space-y-4 bg-zinc-950/40">
                    {/* Document Citations Group */}
                    {docCitations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-emerald-400" />
                          <span>Uploaded Document Grounding</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {docCitations.map((cit, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800/90 space-y-1.5 hover:border-zinc-700/80 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-zinc-200 text-xs truncate" title={cit.document_name}>
                                  {cit.document_name}
                                </span>
                                {cit.page_number && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold shrink-0 border border-emerald-500/20">
                                    Page {cit.page_number}
                                  </span>
                                )}
                              </div>
                              {cit.excerpt && (
                                <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3 italic bg-zinc-950/40 p-2 rounded border border-zinc-800/50">
                                  "{cit.excerpt}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Web Sources Group */}
                    {webCitations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-sky-400" />
                          <span>Live Web Intelligence</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {webCitations.map((cit, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800/90 space-y-1.5 hover:border-zinc-700/80 transition-colors flex flex-col justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-medium text-zinc-200 text-xs line-clamp-1" title={cit.document_name}>
                                    {cit.document_name}
                                  </span>
                                  {cit.url && (
                                    <a
                                      href={cit.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-medium shrink-0 hover:underline"
                                    >
                                      <span>Visit</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                                {cit.excerpt && (
                                  <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                                    {cit.excerpt}
                                  </p>
                                )}
                              </div>
                              {cit.url && (
                                <div className="pt-1 text-[10px] text-zinc-500 truncate font-mono">
                                  {cit.url}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          {!isStreaming && (
            <div className="flex items-center gap-2 pt-1 text-zinc-400">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-zinc-800/80 hover:text-zinc-200 transition-colors text-xs cursor-pointer border border-transparent hover:border-zinc-700/50"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-zinc-800/80 hover:text-zinc-200 transition-colors text-xs cursor-pointer border border-transparent hover:border-zinc-700/50"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Regenerate</span>
                </button>
              )}

              <div className="h-3 w-px bg-zinc-800 mx-1" />

              <button
                type="button"
                onClick={() => handleFeedback(1)}
                className={`p-1.5 rounded-md hover:bg-zinc-800/80 transition-colors cursor-pointer border border-transparent hover:border-zinc-700/50 ${
                  feedback === 1 ? 'text-emerald-400 bg-emerald-950/20' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleFeedback(-1)}
                className={`p-1.5 rounded-md hover:bg-zinc-800/80 transition-colors cursor-pointer border border-transparent hover:border-zinc-700/50 ${
                  feedback === -1 ? 'text-rose-400 bg-rose-950/20' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Poor response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
