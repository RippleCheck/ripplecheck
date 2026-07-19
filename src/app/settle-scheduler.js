/**
 * Fires a callback once a burst of events has *settled* — the timing rule
 * behind "report after the AI finishes, not mid-edit".
 *
 * A plain debounce restarts on every event and so, on its own, can be starved
 * forever by a process that writes continuously (a rebuild loop, a long
 * codegen run). This pairs the restarting window with a max-wait armed once
 * per burst, so the callback always fires: either the moment things go quiet,
 * or after `maxWaitMultiplier` windows, whichever comes first.
 *
 * The window is read via `getWindowMs` at each event rather than captured
 * once, so changing it in Settings takes effect on the next burst without a
 * re-watch. `timers` is injectable purely so tests can drive it deterministically.
 */
function createSettleScheduler({ getWindowMs, onSettled, maxWaitMultiplier = 3, timers = null }) {
  const setTimer = timers?.setTimeout ?? setTimeout;
  const clearTimer = timers?.clearTimeout ?? clearTimeout;

  let settleTimer = null;
  let maxWaitTimer = null;

  function cancel() {
    if (settleTimer) {
      clearTimer(settleTimer);
      settleTimer = null;
    }
    if (maxWaitTimer) {
      clearTimer(maxWaitTimer);
      maxWaitTimer = null;
    }
  }

  function fire() {
    cancel();
    onSettled();
  }

  /** Records that something changed and (re)starts the settle window. */
  function notify() {
    const windowMs = getWindowMs();

    if (settleTimer) clearTimer(settleTimer);
    settleTimer = setTimer(fire, windowMs);

    // Armed once per burst and deliberately never restarted — this is the
    // ceiling that keeps a continuous writer from deferring the report forever.
    if (!maxWaitTimer) {
      maxWaitTimer = setTimer(fire, windowMs * maxWaitMultiplier);
    }
  }

  return { notify, cancel };
}

export { createSettleScheduler };
