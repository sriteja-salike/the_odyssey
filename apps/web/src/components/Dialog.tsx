/* Dialog template (02 §3.1, 01 §11 a11y): measured width, heading, concise
   consequence copy, right-aligned primary + Cancel. Focus moves into the dialog
   and returns to the invoking control; ESC and overlay click cancel. */
import { useEffect, useRef } from "react";

interface Props {
  title: string;
  children: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  onClose: () => void;
  primaryDisabled?: boolean;
  primaryTone?: "action" | "danger";
  cancelLabel?: string;
}

export default function Dialog({
  title, children, primaryLabel, onPrimary, onClose,
  primaryDisabled = false, primaryTone = "action", cancelLabel = "Cancel",
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const invoker = useRef<HTMLElement | null>(null);

  useEffect(() => {
    invoker.current = document.activeElement as HTMLElement;
    const panel = panelRef.current;
    // Focus the first focusable control inside the dialog.
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Tab" && focusables && focusables.length) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      invoker.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={panelRef}>
        <h2 id="dialog-title" className="dialog__title">{title}</h2>
        <div className="dialog__body">{children}</div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" onClick={onClose}>{cancelLabel}</button>
          <button
            className={`btn ${primaryTone === "danger" ? "btn--danger" : "btn--primary"}`}
            onClick={onPrimary}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
