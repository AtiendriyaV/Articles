export interface ArticleMetadata {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags: string[];
  readTime: string;
  author?: string;
  coverImage?: string;
  driveFileId?: string;
  publishedAt?: string;
}

export interface Article extends ArticleMetadata {
  content: string;
}

export interface PublishArticlePayload {
  title: string;
  slug: string;
  content: string;
  tags: string[];
  excerpt: string;
  readTime?: string;
  author?: string;
  passcode?: string;
}

export interface DriveConfigStatus {
  isConfigured: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
  hasFolderId: boolean;
  folderId?: string;
  folderName?: string;
  connectionOk: boolean;
  message: string;
  filesCount?: number;
}
