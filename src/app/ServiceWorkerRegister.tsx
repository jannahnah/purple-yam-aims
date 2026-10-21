"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "Purple Yam service worker registered:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error(
          "Service worker registration failed:",
          error
        );
      });
  }, []);

  return null;
}