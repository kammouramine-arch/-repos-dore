"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReviewStatus } from "@/app/replies/actions";
import { REVIEW_STATUSES, REVIEW_META, type ReviewStatus } from "@/lib/constants";

/**
 * Boutons de suivi de lecture. Ils n'écrivent que dans la base locale :
 * aucun email n'est envoyé, la boîte mail n'est pas modifiée.
 */
export function ReviewActions({
  replyId,
  current,
}: {
  replyId: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REVIEW_STATUSES.map((status) => {
        const active = current === status;
        return (
          <button
            key={status}
            type="button"
            disabled={pending || active}
            onClick={() =>
              startTransition(async () => {
                await setReviewStatus(replyId, status);
                router.refresh();
              })
            }
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors disabled:opacity-60 ${
              active
                ? REVIEW_META[status as ReviewStatus].badge
                : "text-zinc-500 ring-line hover:bg-ink-850 hover:text-zinc-300"
            }`}
          >
            {REVIEW_META[status as ReviewStatus].label}
          </button>
        );
      })}
    </div>
  );
}
