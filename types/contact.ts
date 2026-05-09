export interface ContactMessage {
  contact_id: number;
  name: string;
  reply_to: string;
  subject: string | null;
  message: string;
  created_at: string;
  read_at: string | null;
}

export interface ContactMessagesResponse {
  messages: ContactMessage[];
  total: number;
}
