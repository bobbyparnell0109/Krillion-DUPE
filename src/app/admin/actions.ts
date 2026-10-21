"use server";

/**
 * Admin server actions. Every action re-checks the admin session first.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/security/adminAuth";
import { normalizeAnswer } from "@/lib/text/normalize";
import { promptSignature } from "@/lib/text/similarity";
import { cleanText } from "@/lib/security/sanitize";
import { aiAvailable } from "@/lib/ai/client";
import { topUp } from "@/lib/bank/pipeline";

function str(form: FormData, key: string, max = 120): string {
  return cleanText(form.get(key), max);
}

function tierFrom(form: FormData): number {
  const t = Number(form.get("tier"));
  return Number.isInteger(t) && t >= 1 && t <= 5 ? t : 4;
}

/** Approve a review item: map it onto an existing answer (alias) or add it as a new answer. */
export async function approveReview(form: FormData) {
  await assertAdmin();
  const item = await db.reviewItem.findUnique({ where: { id: str(form, "id", 40) } });
  if (!item) return;
  const mapTo = str(form, "mapTo");
  const display = str(form, "canonical") || item.raw;

  let answerId: string;
  const target = mapTo
    ? await db.answer.findUnique({ where: { promptId_normalized: { promptId: item.promptId, normalized: normalizeAnswer(mapTo) } } })
    : null;
  if (target) {
    answerId = target.id;
    if (item.normalized !== target.normalized) {
      await db.answerAlias.upsert({
        where: { promptId_normalized: { promptId: item.promptId, normalized: item.normalized } },
        create: { promptId: item.promptId, answerId, normalized: item.normalized },
        update: { answerId },
      });
    }
  } else {
    const normalized = normalizeAnswer(display);
    const existing = await db.answer.findUnique({ where: { promptId_normalized: { promptId: item.promptId, normalized } } });
    answerId = existing
      ? (await db.answer.update({ where: { id: existing.id }, data: { canonical: display, priorTier: tierFrom(form), source: "review" } })).id
      : (await db.answer.create({ data: { promptId: item.promptId, canonical: display, normalized, priorTier: tierFrom(form), source: "review" } })).id;
    if (normalized !== item.normalized) {
      await db.answerAlias.upsert({
        where: { promptId_normalized: { promptId: item.promptId, normalized: item.normalized } },
        create: { promptId: item.promptId, answerId, normalized: item.normalized },
        update: { answerId },
      });
    }
  }
  await db.judgementCache.upsert({
    where: { promptId_normalized: { promptId: item.promptId, normalized: item.normalized } },
    create: { promptId: item.promptId, normalized: item.normalized, valid: true, answerId, reason: "Approved by admin" },
    update: { valid: true, answerId, reason: "Approved by admin" },
  });
  await db.reviewItem.update({ where: { id: item.id }, data: { status: "approved" } });
  revalidatePath("/admin/review");
}

/** Reject a review item. If the AI had accepted it as a new answer, remove that answer. */
export async function rejectReview(form: FormData) {
  await assertAdmin();
  const item = await db.reviewItem.findUnique({ where: { id: str(form, "id", 40) } });
  if (!item) return;
  if (item.aiVerdict === "valid") {
    const cached = await db.judgementCache.findUnique({ where: { promptId_normalized: { promptId: item.promptId, normalized: item.normalized } } });
    if (cached?.answerId) {
      const answer = await db.answer.findUnique({ where: { id: cached.answerId } });
      if (answer?.source === "judge") await db.answer.delete({ where: { id: answer.id } });
      else await db.answerAlias.deleteMany({ where: { promptId: item.promptId, normalized: item.normalized } });
    }
  }
  await db.judgementCache.upsert({
    where: { promptId_normalized: { promptId: item.promptId, normalized: item.normalized } },
    create: { promptId: item.promptId, normalized: item.normalized, valid: false, reason: "Rejected by admin" },
    update: { valid: false, answerId: null, reason: "Rejected by admin" },
  });
  await db.reviewItem.update({ where: { id: item.id }, data: { status: "rejected" } });
  revalidatePath("/admin/review");
}

export async function setPromptStatus(form: FormData) {
  await assertAdmin();
  const id = str(form, "id", 40);
  const status = str(form, "status", 10) === "retired" ? "retired" : "active";
  await db.prompt.update({ where: { id }, data: { status } });
  revalidatePath(`/admin/prompts/${id}`);
  revalidatePath("/admin/prompts");
}

export async function updatePromptText(form: FormData) {
  await assertAdmin();
  const id = str(form, "id", 40);
  const text = str(form, "text", 140);
  if (text.length < 8) return;
  try {
    await db.prompt.update({ where: { id }, data: { text, normalized: normalizeAnswer(text), signature: promptSignature(text) } });
  } catch {
    // Another prompt already has this text (unique constraint): leave it unchanged.
  }
  revalidatePath(`/admin/prompts/${id}`);
}

export async function addAnswer(form: FormData) {
  await assertAdmin();
  const promptId = str(form, "promptId", 40);
  const canonical = str(form, "canonical");
  const normalized = normalizeAnswer(canonical);
  if (!normalized) return;
  await db.answer.upsert({
    where: { promptId_normalized: { promptId, normalized } },
    create: { promptId, canonical, normalized, priorTier: tierFrom(form), source: "admin" },
    update: { canonical, priorTier: tierFrom(form) },
  });
  revalidatePath(`/admin/prompts/${promptId}`);
}

export async function setAnswerTier(form: FormData) {
  await assertAdmin();
  const answer = await db.answer.update({ where: { id: str(form, "id", 40) }, data: { priorTier: tierFrom(form) } });
  revalidatePath(`/admin/prompts/${answer.promptId}`);
}

export async function deleteAnswer(form: FormData) {
  await assertAdmin();
  const answer = await db.answer.delete({ where: { id: str(form, "id", 40) } });
  revalidatePath(`/admin/prompts/${answer.promptId}`);
}

/** Generate a few prompts right now (kept small so the request doesn't time out). */
export async function generateNow(form: FormData) {
  await assertAdmin();
  if (!aiAvailable()) return;
  const count = Math.min(10, Math.max(1, Number(form.get("count")) || 5));
  await topUp(() => {}, { maxNew: count, deadline: Date.now() + 240_000 });
  revalidatePath("/admin");
}
