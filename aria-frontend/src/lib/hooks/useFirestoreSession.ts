"use client";
import { useEffect } from "react";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useARIAStore } from "@/lib/store/aria-store";
import type { FirestoreAuditStep } from "@/types/aria";

const LS_KEY = "aria_session_id";

export function useFirestoreSession() {
  const sessionId = useARIAStore((state) => state.sessionId);
  const panelStatus = useARIAStore((state) => state.panelStatus);

  // On mount: restore sessionId from localStorage if store has none (AC: 6)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(LS_KEY);
    if (stored && !useARIAStore.getState().sessionId) {
      useARIAStore.setState({ sessionId: stored });
    }
  }, []);

  // Persist sessionId to localStorage whenever it is set (AC: 6)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionId) {
      localStorage.setItem(LS_KEY, sessionId);
    }
  }, [sessionId]);

  // Clear stale localStorage key when task completes or fails (AC: 6)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (panelStatus === "complete" || panelStatus === "failed") {
      localStorage.removeItem(LS_KEY);
    }
  }, [panelStatus]);

  // Subscribe to Firestore and hydrate auditLog in real time
  useEffect(() => {
    if (!sessionId) return;

    const db = getFirestore(app);
    const sessionRef = doc(db, "sessions", sessionId);

    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const steps = (data.steps ?? []) as FirestoreAuditStep[];
        useARIAStore.setState({ auditLog: steps });
      },
      (error) => {
        console.warn("[useFirestoreSession] onSnapshot error:", error);
      }
    );

    return () => unsubscribe();
  }, [sessionId]);
}
