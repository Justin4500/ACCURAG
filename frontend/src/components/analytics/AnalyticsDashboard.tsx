import React from 'react';
import {
  FileText,
  Layers,
  MessageSquare,
  HardDrive,
  Database,
  CheckCircle,
  FolderOpen,
} from 'lucide-react';
import { AnalyticsData } from '../../types';

interface AnalyticsDashboardProps {
  analytics: AnalyticsData | null;
  isLoading: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  isLoading,
}) => {
  if (isLoading || !analytics) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
        Loading analytics metrics...
      </div>
    );
  }

  const maxStorageAllowanceMb = 500;
  const storagePercentage = Math.min(
    100,
    Math.round((analytics.storage_used_mb / maxStorageAllowanceMb) * 100)
  );

  const stats = [
    {
      label: 'Indexed Documents',
      value: analytics.total_documents,
      icon: <FileText className="w-5 h-5 text-blue-400" />,
      sub: 'Multi-format files stored',
    },
    {
      label: 'Document Pages Processed',
      value: analytics.total_pages,
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      sub: 'Preserved with page citations',
    },
    {
      label: 'ChromaDB Vector Chunks',
      value: analytics.total_chunks,
      icon: <Database className="w-5 h-5 text-emerald-400" />,
      sub: 'Embedded semantic chunks',
    },
    {
      label: 'Active Conversations',
      value: analytics.total_conversations,
      icon: <MessageSquare className="w-5 h-5 text-amber-400" />,
      sub: `${analytics.total_messages} total messages`,
    },
    {
      label: 'Document Collections',
      value: analytics.total_collections,
      icon: <FolderOpen className="w-5 h-5 text-purple-400" />,
      sub: 'Grouped topic workspaces',
    },
    {
      label: 'Local Storage Used',
      value: `${analytics.storage_used_mb} MB`,
      icon: <HardDrive className="w-5 h-5 text-rose-400" />,
      sub: `${storagePercentage}% of ${maxStorageAllowanceMb} MB allowance`,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">System Analytics & Health</h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Detailed metrics for document storage, vector chunks in ChromaDB, and question-answering interactions.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-3 shadow-sm hover:border-[#2a3044] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{s.label}</span>
              <div className="p-2 rounded-xl bg-[#1b2032] border border-[#272d42]">
                {s.icon}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100 font-mono">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Storage and Pipeline Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-rose-400" />
              <span>Storage Quota Utilization</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {analytics.storage_used_mb} / {maxStorageAllowanceMb} MB
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[#1e2335] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, storagePercentage)}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Local persistent file storage handles extracted uploads and persistent vector storage in ChromaDB without cloud leakages.
          </p>
        </div>

        <div className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>RAG Architecture Status</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#1c2030]">
              <span className="text-slate-400">Primary Relational DB</span>
              <span className="text-emerald-400 font-medium">PostgreSQL (SQLAlchemy / Alembic)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1c2030]">
              <span className="text-slate-400">Vector Store</span>
              <span className="text-emerald-400 font-medium">ChromaDB (Persistent HNSW)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1c2030]">
              <span className="text-slate-400">Embedding Engine</span>
              <span className="text-blue-400 font-medium">text-embedding-004 / FastEmbed ONNX</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Inference Engine</span>
              <span className="text-indigo-400 font-medium">Google Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
