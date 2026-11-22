"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { system } from "@/copy";

// Installing Fogline (F1.6). Android Chrome fires `beforeinstallprompt` once, early, so the
// layout keeps it here until a prompt is allowed. iOS Safari has no event: it gets the Add to
// Home Screen steps. A dismissal is remembered for 7 days on this device.

type InstallEvent = Event & { prompt: () => Promise<void> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function isInstallEvent(e: Event): e is InstallEvent {
  return "prompt" in e && typeof e.prompt === "function";
}

/** Keeps the install event for later. Mounted once, in the root layout. */
export function InstallListener() {
  useEffect(() => {
    const keep = (e: Event) => {
      if (!isInstallEvent(e)) return;
      e.preventDefault();
      deferred = e;
      notify();
    };
    const installed = () => {
      deferred = null;
      notify();
    };
    window.addEventListener("beforeinstallprompt", keep);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", keep);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  return null;
}

const dismissKey = "fogline-install-dismissed";
const week = 7 * 24 * 60 * 60_000;

function dismissedRecently(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(dismissKey) ?? 0) < week;
  } catch (e) {
    if (e instanceof DOMException) return false;
    throw e;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(dismissKey, String(Date.now()));
  } catch (e) {
    if (!(e instanceof DOMException)) throw e;
  }
}

type Kind = "android" | "ios" | null;

function installKind(): Kind {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true);
  if (standalone || dismissedRecently()) return null;
  if (deferred) return "android";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const safari =
    /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  return ios && safari ? "ios" : null;
}

function subscribe(change: () => void) {
  listeners.add(change);
  return () => listeners.delete(change);
}

/** The install prompt, shown after a first completed action (F1.6) by the screen that has one. */
export function InstallPrompt() {
  const kind = useSyncExternalStore(subscribe, installKind, () => null);
  const [hidden, setHidden] = useState(false);
  if (!kind || hidden) return null;
  const s = system.install;

  function dismiss() {
    rememberDismissal();
    setHidden(true);
  }

  return (
    <section
      aria-labelledby="install"
      className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4"
    >
      <h2 id="install" className="font-extrabold">
        {s.title}
      </h2>
      <p className="text-sm">{s.body}</p>
      {kind === "ios" && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Share aria-hidden="true" className="size-4 shrink-0" />
            {s.iosSteps}
          </p>
          <p className="text-sm text-ink-muted">{s.iosCode}</p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {kind === "android" && (
          <Button
            onClick={async () => {
              await deferred?.prompt();
              deferred = null;
              notify();
            }}
          >
            <Download aria-hidden="true" />
            {s.install}
          </Button>
        )}
        <Button variant="ghost" onClick={dismiss}>
          {s.notNow}
        </Button>
      </div>
    </section>
  );
}
