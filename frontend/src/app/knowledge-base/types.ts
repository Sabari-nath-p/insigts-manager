export type KnowledgeResourceType = 'document' | 'file' | 'link';
export type KnowledgeResourceStatus = 'draft' | 'published' | 'archived';
export type KnowledgeVisibility = 'all' | 'restricted';

export interface KnowledgeResource {
  id: string;
  title: string;
  description: string | null;
  categoryGroup: string;
  category: string;
  tags: string[] | null;
  type: KnowledgeResourceType;
  status: KnowledgeResourceStatus;
  content: string | null;
  externalUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  visibility: KnowledgeVisibility;
  allowedDepartments: string[] | null;
  allowedRoles: string[] | null;
  createdBy: string;
  updatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
