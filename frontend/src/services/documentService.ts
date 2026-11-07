import { api } from './api';
import { DocumentItem } from '../types';

export const documentService = {
  async uploadDocuments(files: File[]): Promise<DocumentItem[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await api.post<DocumentItem[]>('/documents/upload', formData);
    return res.data;
  },

  async listDocuments(): Promise<DocumentItem[]> {
    const res = await api.get<{ items: DocumentItem[]; total: number }>('/documents');
    return res.data.items;
  },

  async getDocument(documentId: string): Promise<DocumentItem> {
    const res = await api.get<DocumentItem>(`/documents/${documentId}`);
    return res.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}`);
  },

  async retryDocument(documentId: string): Promise<{ id: string; status: string; message: string }> {
    const res = await api.post(`/documents/${documentId}/retry`);
    return res.data;
  },

  getDocumentFileUrl(documentId: string): string {
    const token = localStorage.getItem('accurate_ai_token');
    return `/api/documents/${documentId}/file?token=${token || ''}`;
  },
};
