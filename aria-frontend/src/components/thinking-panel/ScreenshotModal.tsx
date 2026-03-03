"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ScreenshotModalProps = {
  screenshotUrl: string;
  stepIndex: number;
  onClose: () => void;
};

export function ScreenshotModal({
  screenshotUrl,
  stepIndex,
  onClose,
}: ScreenshotModalProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-full bg-surface border-border-aria p-4">
        <DialogHeader>
          <DialogTitle className="text-text-primary text-sm font-mono">
            Screenshot — Step #{stepIndex + 1}
          </DialogTitle>
        </DialogHeader>
        <img
          src={screenshotUrl}
          alt={`Step ${stepIndex + 1} screenshot`}
          className="w-full h-auto rounded border border-border-aria"
          loading="lazy"
        />
      </DialogContent>
    </Dialog>
  );
}
