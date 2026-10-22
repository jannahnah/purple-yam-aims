"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

type AlertWindow = Window & { __aimsToastAlertInstalled?: boolean };

export default function ToastBridge() {
  const { notify } = useToast();

  useEffect(() => {
    const alertWindow = window as AlertWindow;
    if (alertWindow.__aimsToastAlertInstalled) return;

    const originalAlert = window.alert.bind(window);
    window.alert = ((message?: unknown) => {
      const text = String(message ?? "");
      const lower = text.toLowerCase();
      const type = /\b(failed|fail|error|unable|could not|cannot|insufficient|invalid|must|required)\b/.test(lower)
        ? "error"
        : /\b(warning|low stock|attention)\b/.test(lower)
          ? "warning"
          : /\b(success|successfully|recorded|updated|saved|deleted|transferred|completed|logged)\b/.test(lower)
            ? "success"
            : "info";
      notify({ message: text, type, duration: 2500 });
    }) as typeof window.alert;

    alertWindow.__aimsToastAlertInstalled = true;
    return () => {
      // Keep the app-level override installed across route changes. This avoids
      // re-wrapping window.alert every time React remounts the bridge.
      void originalAlert;
    };
  }, [notify]);

  return null;
}
