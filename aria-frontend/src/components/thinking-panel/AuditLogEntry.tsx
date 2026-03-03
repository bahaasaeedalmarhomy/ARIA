"use client";

import React, { useState } from "react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ScreenshotModal } from "./ScreenshotModal";
import type { FirestoreAuditStep } from "@/types/aria";

type AuditLogEntryProps = {
  entry: FirestoreAuditStep;
};

// Action type → short label for badge
const ACTION_LABELS: Record<string, string> = {
  navigate: "NAV",
  click: "CLK",
  type: "TYP",
  scroll: "SCR",
  screenshot: "SHOT",
  wait: "WAIT",
  extract: "READ",
};

export function AuditLogEntry({ entry }: AuditLogEntryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const actionLabel =
    ACTION_LABELS[entry.action_type ?? ""] ??
    (entry.action_type ?? "ACT").toUpperCase().slice(0, 4);

  // Format ISO timestamp to HH:MM:SS display
  const timeDisplay = entry.timestamp
    ? new Date(entry.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <li
      className="flex flex-col gap-1 py-2 border-b border-border-aria last:border-0"
      data-testid={`audit-entry-${entry.step_index}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-text-disabled shrink-0 font-mono text-xs w-5 text-right">
          #{entry.step_index + 1}
        </span>
        <span className="bg-raised text-text-secondary text-xs font-mono px-1.5 py-0.5 rounded shrink-0">
          {actionLabel}
        </span>
        <span className="flex-1 text-xs font-mono text-text-primary leading-relaxed">
          {entry.description}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceBadge confidence={entry.confidence} />
          {timeDisplay && (
            <span className="text-text-disabled text-xs font-mono">{timeDisplay}</span>
          )}
        </div>
      </div>

      {entry.screenshot_url && (
        <div className="pl-7">
          <button
            type="button"
            aria-label={`View screenshot for step ${entry.step_index + 1}`}
            className="rounded overflow-hidden border border-border-aria hover:border-blue-500 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
            onClick={() => setModalOpen(true)}
          >
            <img
              src={entry.screenshot_url}
              alt={`Step ${entry.step_index + 1} thumbnail`}
              className="w-48 h-auto max-h-24 object-cover object-top block"
              loading="lazy"
            />
          </button>
        </div>
      )}

      {modalOpen && entry.screenshot_url && (
        <ScreenshotModal
          screenshotUrl={entry.screenshot_url}
          stepIndex={entry.step_index}
          onClose={() => setModalOpen(false)}
        />
      )}
    </li>
  );
}
