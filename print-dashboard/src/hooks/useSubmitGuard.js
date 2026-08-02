// Build decision #8: disable the button and show a loading state the
// moment any Save/Submit/Apply/Create action is clicked, re-enabling
// only once the request settles (success or failure) -- applied across
// every creation/save/apply action in the app, not just Apply Sync
// (Settings.jsx's handleApplySync/handleSave already did this on their
// own before this decision; this hook is for everywhere else that didn't).
//
// Deliberately just a `submitting` flag + a wrapper, not a full form
// library -- every call site here already owns its own form state and
// its own success/error handling (toasts, previews, friendlyError(...)).
// This only adds the "ignore clicks while one is already in flight, and
// let the button show it" behavior on top, without changing what each
// call site does on success or failure.
import { useRef, useState } from 'react';

export function useSubmitGuard() {
  const [submitting, setSubmitting] = useState(false);
  const inFlightRef = useRef(false); // mirrors `submitting` synchronously, since state updates aren't -- guards against a second click landing in the same tick before re-render disables the button

  // Wraps an async action so a second click while one is still running
  // is ignored outright, rather than firing a second overlapping request.
  // Re-enables in `finally` regardless of success or failure, per the
  // decision -- a failed save should still let the person try again.
  const guard = async (action) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      return await action();
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return { submitting, guard };
}
