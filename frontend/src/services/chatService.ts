import { api, API_BASE_URL } from './api';
import {
  ConversationItem,
  ConversationDetail,
  CitationItem,
} from '../types';

export interface RagResponse {
  answer: string;
  citations: CitationItem[];
  conversation_id: string;
  message_id: string;
  has_sufficient_context: boolean;
}

export const chatService = {
  async listConversations(): Promise<ConversationItem[]> {
    const res = await api.get<ConversationItem[]>('/chat');
    return res.data;
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const res = await api.get<ConversationDetail>(`/chat/${conversationId}`);
    return res.data;
  },

  async createConversation(title?: string, collectionId?: string): Promise<ConversationItem> {
    const res = await api.post<ConversationItem>('/chat', {
      title: title || 'New Chat',
      collection_id: collectionId,
    });
    return res.data;
  },

  async updateConversation(conversationId: string, title: string): Promise<void> {
    await api.put(`/chat/${conversationId}`, { title });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/chat/${conversationId}`);
  },

  async queryRag(
    query: string,
    conversationId?: string,
    collectionId?: string,
    documentIds?: string[]
  ): Promise<RagResponse> {
    const res = await api.post<RagResponse>('/rag/query', {
      query,
      conversation_id: conversationId,
      collection_id: collectionId,
      document_ids: documentIds,
    });
    return res.data;
  },

  async streamRag(
    query: string,
    conversationId: string | undefined,
    collectionId: string | undefined,
    documentIds: string[] | undefined,
    callbacks: {
      onCitations?: (citations: CitationItem[]) => void;
      onStatus?: (status: string) => void;
      onChunk?: (text: string) => void;
      onDone?: (info: { conversation_id: string; message_id: string }) => void;
      onError?: (error: string) => void;
    },
    abortSignal?: AbortSignal
  ): Promise<void> {
    const token = localStorage.getItem('accurate_ai_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/rag/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          conversation_id: conversationId,
          collection_id: collectionId,
          document_ids: documentIds,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        callbacks.onError?.(errorText || `Server returned error ${response.status}`);
        return;
      }

      if (!response.body) {
        callbacks.onError?.('ReadableStream not supported by browser.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'citations') {
                callbacks.onCitations?.(data.citations);
              } else if (data.type === 'status') {
                callbacks.onStatus?.(data.message);
              } else if (data.type === 'text') {
                callbacks.onChunk?.(data.content);
              } else if (data.type === 'done') {
                callbacks.onDone?.({
                  conversation_id: data.conversation_id,
                  message_id: data.message_id,
                });
              } else if (data.type === 'error') {
                callbacks.onError?.(data.content);
              }
            } catch (err) {
              console.error('Error parsing SSE event', err, trimmed);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Generation cancelled by user
        return;
      }
      callbacks.onError?.(err.message || 'Stream connection failed.');
    }
  },

  async submitFeedback(messageId: string, rating: number, comments?: string): Promise<void> {
    await api.post('/chat/feedback', {
      message_id: messageId,
      rating,
      comments,
    });
  },
};
