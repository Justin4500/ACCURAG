import { api } from './api';
import { CollectionItem } from '../types';

export const collectionService = {
  async listCollections(): Promise<CollectionItem[]> {
    const res = await api.get<CollectionItem[]>('/collections');
    return res.data;
  },

  async getCollection(collectionId: string): Promise<CollectionItem> {
    const res = await api.get<CollectionItem>(`/collections/${collectionId}`);
    return res.data;
  },

  async createCollection(name: string, description?: string): Promise<CollectionItem> {
    const res = await api.post<CollectionItem>('/collections', {
      name,
      description,
    });
    return res.data;
  },

  async updateCollection(collectionId: string, name: string, description?: string): Promise<CollectionItem> {
    const res = await api.put<CollectionItem>(`/collections/${collectionId}`, {
      name,
      description,
    });
    return res.data;
  },

  async deleteCollection(collectionId: string): Promise<void> {
    await api.delete(`/collections/${collectionId}`);
  },

  async addDocuments(collectionId: string, documentIds: string[]): Promise<CollectionItem> {
    const res = await api.post<CollectionItem>(`/collections/${collectionId}/documents`, {
      document_ids: documentIds,
    });
    return res.data;
  },

  async removeDocument(collectionId: string, documentId: string): Promise<CollectionItem> {
    const res = await api.delete<CollectionItem>(`/collections/${collectionId}/documents/${documentId}`);
    return res.data;
  },
};
