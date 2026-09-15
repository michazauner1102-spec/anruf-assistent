"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "failed";

/**
 * navigator.clipboard braucht einen Secure Context. localhost ist einer,
 * http://192.168.x.x:3000 (Handy im WLAN) nicht — daher der execCommand-Fallback.
 */
export function CopyButton({ text, label = "Kopieren" }: { text: string; label?: string }) {
  const [state, setState] = useState<State>("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const flash = (next: State) => {
    setState(next);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setState("idle"), 1800);
  };

  const legacyCopy = (): boolean => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  };

  const copy = async () => {
    // Erst die moderne API; wenn sie fehlt ODER wirft (Berechtigung verweigert,
    // kein Secure Context am Handy per http://IP), greift der aeltere Weg.
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        flash("copied");
        return;
      } catch {
        // faellt unten auf execCommand zurueck
      }
    }
    flash(legacyCopy() ? "copied" : "failed");
  };

  return (
    <button type="button" className="btn btn--copy" onClick={copy}>
      {state === "copied" ? "Kopiert!" : state === "failed" ? "Nicht möglich" : label}
    </button>
  );
}
