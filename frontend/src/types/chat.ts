export interface Avatar {
  id: string;
  name: string;
  role: string;
  description?: string;
  skills: string[];
  imageUrl?: string;
}

export interface MessageMetadata {
  isUser: boolean;
  avatar?: Avatar;
  timestamp: string;
  complete: boolean;
  error?: string;
}

export interface MessageContent {
  text: string;
  thinking?: string;
}

export interface Message {
  id: string;
  content: MessageContent;
  metadata: MessageMetadata;
  state: {
    type: 'complete' | 'streaming' | 'error';
    error?: string;
  };
}

export interface ChatSession {
  id: string;
  messages: Message[];
  avatars: Avatar[];
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  type: 'text' | 'code' | 'vega-lite' | 'table';
  content: any;
  language?: string;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
} 