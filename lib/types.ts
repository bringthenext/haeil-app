// ─────────────────────────────────────────────────────────────────────────────
// 공통 DB 타입 — haeil (web) / haeil-native 양쪽에서 동일하게 유지
// DB 스키마 변경 시 두 레포 동기화 필요
// ─────────────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type Envelope = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  order: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Paper = {
  id: string;
  user_id: string;
  envelope_id: string | null;
  parent_paper_id: string | null;
  name: string | null; // null = draft paper
  status: "active" | "completed";
  is_favorite: boolean;
  order: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
};

export type Item = {
  id: string;
  user_id: string;
  paper_id: string | null; // null = inbox draft item
  content: string;
  is_checked: boolean;
  scheduled_date: string | null; // YYYY-MM-DD
  order: number | null;
  created_at: string;
  updated_at: string;
  checked_at: string | null;
  deleted_at: string | null;
};

export type Wave = {
  id: string;
  user_id: string;
  paper_id: string;
  completed_at: string;
};

// ─── API 페이로드 타입 ────────────────────────────────────────────────────────

export type AddItemPayload = {
  content: string;
  paper_id: string | null;
  scheduled_date?: string | null;
};

export type AddPaperPayload = {
  name: string | null; // null = draft
  envelope_id: string | null;
  status?: "active" | "completed";
};

export type AddEnvelopePayload = {
  name: string;
  color?: string | null;
};
