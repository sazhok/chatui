export type AttachmentRef = {
  filename: string;
};

export type AttachmentDraft = {
  filename: string;
  content: string;
};

export type Message = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  attachments?: AttachmentRef[];
};

export type Conversation = {
  id: number;
  title: string;
  model: string | null;
  created_at: string;
};

export type ConversationDetail = Conversation & {
  messages: Message[];
};

export type SearchResult = Conversation & {
  snippet: string;
};

export type CatalogLocation = {
  id: string;
  checklists: string[];
};

export type CatalogSubdomain = {
  name: string;
  locations: CatalogLocation[];
};

export type ChecklistSession = {
  id: number;
  title: string;
  subdomain: string;
  created_at: string;
  locations: string[];
  checklists: string[];
};

/** One CSV row of a checklist, straight from the catalog (columns vary). */
export type ChecklistQuestion = Record<string, string>;

export type UsageRow = {
  user: string;
  model: string;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type AdminUser = {
  id: number;
  username: string;
  role: string;
  created_at: string;
};
