import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import type { AddEnvelopePayload, AddItemPayload, AddPaperPayload } from "@/lib/types";
import { addEnvelope } from "@/lib/api/envelopes";
import { addItem, classifyItemToEnvelope, deleteItem, toggleItem, updateItemDateAndOrder, updateItemOrders } from "@/lib/api/items";
import { addPaper, completePaper, deletePaper, updatePaperOrders } from "@/lib/api/papers";

const QUEUE_KEY = "offline_queue";
const MAX_RETRY = 3;

export type QueuedOp =
  | { type: "addItem"; id: string; userId: string; payload: AddItemPayload }
  | { type: "toggleItem"; id: string; checked: boolean; checkedAt: string | null }
  | { type: "addPaper"; id: string; userId: string; payload: AddPaperPayload }
  | { type: "completePaper"; id: string; isDraft: boolean }
  | { type: "addEnvelope"; id: string; userId: string; payload: AddEnvelopePayload }
  | { type: "updateItemDate"; id: string; date: string; order: number }
  | { type: "updateItemOrder"; updates: { id: string; order: number }[] }
  | { type: "updatePaperOrder"; updates: { id: string; order: number }[] }
  | { type: "classifyItem"; itemId: string; envelopeId: string; userId: string }
  | { type: "deleteItem"; id: string }
  | { type: "deletePaper"; id: string };

type StoredEntry = { opId: string; retries: number; op: QueuedOp };

export function generateId(): string {
  return randomUUID();
}

async function loadQueue(): Promise<StoredEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(entries: StoredEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

export async function enqueue(op: QueuedOp): Promise<void> {
  const entries = await loadQueue();
  entries.push({ opId: generateId(), retries: 0, op });
  await saveQueue(entries);
}

export async function getQueueLength(): Promise<number> {
  const entries = await loadQueue();
  return entries.length;
}

async function executeOp(op: QueuedOp): Promise<void> {
  switch (op.type) {
    case "addItem":
      await addItem(op.userId, op.payload, op.id);
      break;
    case "toggleItem": {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase
        .from("items")
        .update({ is_checked: op.checked, checked_at: op.checkedAt })
        .eq("id", op.id);
      if (error) throw error;
      break;
    }
    case "addPaper":
      await addPaper(op.userId, op.payload, op.id);
      break;
    case "completePaper":
      await completePaper(op.id, op.isDraft);
      break;
    case "addEnvelope":
      await addEnvelope(op.userId, op.payload, op.id);
      break;
    case "updateItemDate":
      await updateItemDateAndOrder(op.id, op.date, op.order);
      break;
    case "updateItemOrder":
      await updateItemOrders(op.updates);
      break;
    case "updatePaperOrder":
      await updatePaperOrders(op.updates);
      break;
    case "classifyItem":
      await classifyItemToEnvelope(op.itemId, op.envelopeId, op.userId);
      break;
    case "deleteItem":
      await deleteItem(op.id);
      break;
    case "deletePaper":
      await deletePaper(op.id);
      break;
  }
}

function isSkippable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as Record<string, unknown>).code;
  const status = (error as Record<string, unknown>).status;
  // 404: 이미 삭제됨, 409/23505: 중복
  return status === 404 || status === 409 || code === "23505";
}

export async function replayQueue(
  onToast?: (msg: string) => void,
): Promise<number> {
  const entries = await loadQueue();
  if (entries.length === 0) return 0;

  const remaining: StoredEntry[] = [];
  let replayed = 0;

  for (const entry of entries) {
    try {
      await executeOp(entry.op);
      replayed++;
    } catch (err) {
      if (isSkippable(err)) {
        // skip silently
        replayed++;
      } else if (entry.retries + 1 >= MAX_RETRY) {
        onToast?.(`오프라인 작업 일부를 동기화하지 못했어요.`);
        // drop
      } else {
        remaining.push({ ...entry, retries: entry.retries + 1 });
      }
    }
  }

  await saveQueue(remaining);
  return replayed;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
