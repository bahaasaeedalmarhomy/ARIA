"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import type { ConfirmationRequest } from "@/types/aria";
import { BACKEND_URL } from "@/lib/constants";

interface Props {
  request: ConfirmationRequest;
  sessionId: string;
  onDismiss: () => void;
}

export function ConfirmActionDialog({ request, sessionId, onDismiss }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const postConfirm = async (confirmed: boolean) => {
    await fetch(`${BACKEND_URL}/api/task/${sessionId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed }),
    }).catch(() => undefined); // non-fatal — dialog dismisses regardless
    onDismiss();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      postConfirm(true);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      postConfirm(false);
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // Focus trap: cycle between Cancel and Confirm buttons
      if (document.activeElement === cancelRef.current) {
        confirmRef.current?.focus();
      } else {
        cancelRef.current?.focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-zinc-900 border border-rose-500/50 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2
          id="confirm-dialog-title"
          className="text-text-primary font-semibold text-base mb-3"
        >
          Confirm Irreversible Action
        </h2>
        <div className="bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2 mb-4 flex items-center gap-2 text-rose-400 text-sm">
          ⚠️ {request.warning}
        </div>
        <p id="confirm-dialog-desc" className="text-text-secondary text-sm mb-6">
          {request.action_description}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={() => postConfirm(false)}
            className="px-4 py-2 rounded bg-zinc-800 text-text-secondary hover:bg-zinc-700 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={() => postConfirm(true)}
            className="px-4 py-2 rounded bg-rose-600 text-white hover:bg-rose-700 text-sm font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
