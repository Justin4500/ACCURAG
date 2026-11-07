export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface DocumentItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  page_count: number;
  chunk_count: number;
  status: DocumentStatus;
  error_message?: string;
  ocr_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  document_count: number;
  documents: DocumentItem[];
  created_at: string;
  updated_at: string;
}

export interface CitationItem {
  document_id: string;
  document_name: string;
  page_number?: number;
  excerpt: string;
  score?: number;
  source_type?: 'document' | 'web';
  url?: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessageItem {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  citations?: CitationItem[];
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  collection_id?: string;
  message_count: number;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  collection_id?: string;
  messages: ChatMessageItem[];
  created_at: string;
  updated_at: string;
}

export interface UserSettingsData {
  theme: 'dark' | 'light' | 'system';
  ai_provider: string;
  has_custom_key: boolean;
  chunk_size: number;
  top_k: number;
  system_has_gemini_key: boolean;
}

export interface AnalyticsData {
  total_documents: number;
  total_pages: number;
  total_chunks: number;
  total_conversations: number;
  total_messages: number;
  total_collections: number;
  storage_used_bytes: number;
  storage_used_mb: number;
}
