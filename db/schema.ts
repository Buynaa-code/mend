export interface GreetingRow {
  id: string;
  guest_id: string | null;
  creator_email: string | null;
  recipient_name: string;
  template_id: string | null;
  greeting_status: string;
  payment_status: string;
  engagement_status: string;
  moderation_status: string;
  slug: string | null;
  draft_json: Record<string, unknown>;
  total_view_count: number;
  unique_view_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReactionRow {
  id: string;
  greeting_id: string;
  session_id: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export interface ReplyRow {
  id: string;
  greeting_id: string;
  session_id: string;
  message: string;
  created_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  greeting_id: string | null;
  actor: string;
  action: string;
  previous_value: string | null;
  next_value: string | null;
  reason: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      greetings: { Row: GreetingRow; Insert: Partial<GreetingRow> & Pick<GreetingRow, "id" | "draft_json" | "created_at" | "updated_at">; Update: Partial<GreetingRow> };
      reactions: { Row: ReactionRow; Insert: ReactionRow; Update: Partial<ReactionRow> };
      replies: { Row: ReplyRow; Insert: ReplyRow; Update: Partial<ReplyRow> };
      admin_audit_logs: { Row: AdminAuditLogRow; Insert: AdminAuditLogRow; Update: Partial<AdminAuditLogRow> };
    };
  };
}
