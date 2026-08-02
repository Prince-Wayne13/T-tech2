import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

// Build decision #7, pieces C (backup notification bell) and D (live
// refresh when a backup lands elsewhere): a single shared poll against
// GET /backup/available (already returns the latest backup per OTHER
// device, keyed by device_id, with a real modified_at timestamp -- see
// restore_inspector.py's list_available_backups, decision #3's fix).
// One hook powers both features, since they're the same underlying
// signal ("something changed on another device that this device
// hasn't seen yet") -- no separate polling loop for each.
//
// Deliberately does NOT force a remount/refetch of whatever page the
// person is currently looking at. Every page (Jobs, Invoices, etc.)
// keeps its own local component state for open modals/in-progress
// forms (NewJobModal's showEntry, editRecord, etc.) -- forcing a
// remount the instant a backup lands elsewhere would silently wipe
// any unsaved, half-typed form the moment that happens, which is a
// real data-loss risk, not a cosmetic one. Instead this hook exposes
// `newSinceNav` -- whether a new backup has landed since the person
// last navigated to a NEW page -- so App.jsx can key the active page
// by that value only at the moment of navigation, not while sitting
// on a page. That means: "live" here means "fresh the next time you
// look at a page", not "instantly updates out from under you".
const POLL_INTERVAL_MS = 45000; // matches sales.jsx's existing quiet-poll interval

export function useBackupWatch() {
  const [thisDeviceId, setThisDeviceId] = useState(null);
  const [newBackups, setNewBackups] = useState([]); // [{device_id, modified_at}, ...] not yet acknowledged
  const lastSeenRef = useRef({}); // device_id -> modified_at ISO string, the newest we've already shown

  useEffect(() => {
    let cancelled = false;
    api.deviceIdentity()
      .then(identity => { if (!cancelled) setThisDeviceId(identity.device_id); })
      .catch(() => {}); // non-fatal -- if this fails, the poll below just treats every entry as "other"
    return () => { cancelled = true; };
  }, []);

  const pollOnce = () => {
    api.availableBackups()
      .then(data => {
        const entries = data.backups || [];
        const fresh = [];
        for (const entry of entries) {
          if (entry.device_id === thisDeviceId) continue; // never notify about our own device
          const lastSeen = lastSeenRef.current[entry.device_id];
          // Strict greater-than, not >=: a backup with the SAME
          // modified_at as one we've already shown is not new, and a
          // modified_at OLDER than what we've seen (clock skew, or an
          // older backup restored/re-synced) must not re-trigger --
          // this device's own history of what it's already shown only
          // ever moves forward.
          if (!lastSeen || entry.modified_at > lastSeen) {
            fresh.push(entry);
          }
        }
        if (fresh.length > 0) {
          setNewBackups(prev => {
            const byDevice = { ...Object.fromEntries(prev.map(e => [e.device_id, e])) };
            for (const entry of fresh) byDevice[entry.device_id] = entry;
            return Object.values(byDevice);
          });
        }
      })
      .catch(() => {}); // quiet poll -- backend being briefly unreachable shouldn't surface an error banner
  };

  useEffect(() => {
    if (thisDeviceId === null) return; // wait until we know our own id, so we don't self-notify on the first poll
    pollOnce();
    const interval = setInterval(pollOnce, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thisDeviceId]);

  // Call when the person actually acts on a notification (opens the
  // bell, or navigates to Settings to sync) -- marks everything
  // currently queued as seen, so it stops showing as new. Does NOT
  // clear newSinceNav's effect on already-rendered pages; it only
  // stops the BELL badge, matching "I've seen this" rather than
  // "pretend it never happened".
  const markSeen = () => {
    setNewBackups(prev => {
      for (const entry of prev) {
        lastSeenRef.current[entry.device_id] = entry.modified_at;
      }
      return [];
    });
  };

  return {
    hasNewBackup: newBackups.length > 0,
    newBackups,
    markSeen,
  };
}
