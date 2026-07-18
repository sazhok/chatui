export type Message = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
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
