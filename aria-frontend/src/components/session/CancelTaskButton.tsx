"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useARIAStore } from "@/lib/store/aria-store";

export function CancelTaskButton() {
  const { sessionId, taskStatus } = useARIAStore();
  const [isCancelling, setIsCancelling] = useState(false);

  if (taskStatus !== "running" && taskStatus !== "paused" && taskStatus !== "awaiting_input") {
    return null;
  }

  const handleCancel = async () => {
    if (!sessionId || isCancelling) return;
    setIsCancelling(true);
    try {
      await fetch(`/api/task/${sessionId}/interrupt`, { method: "POST" });
      // Don't reset isCancelling — SSE task_failed event will hide the button
    } catch {
      // Network error: reset so user can retry
      setIsCancelling(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
      onClick={handleCancel}
      disabled={isCancelling}
      data-testid="cancel-task-button"
      aria-label="Cancel current task"
    >
      {isCancelling ? "Cancelling\u2026" : "Cancel Task"}
    </Button>
  );
}
