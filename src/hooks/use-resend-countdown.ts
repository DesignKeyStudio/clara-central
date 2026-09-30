"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Countdown driving a "Resend code" control. `secondsLeft` ticks down to 0 once
 * per second; the resend control is enabled only at 0. Call `start(seconds)`
 * after each successful send — or with a server-provided retry-after — to (re)arm
 * the countdown.
 */
export function useResendCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const start = useCallback((seconds: number) => {
    setSecondsLeft(Math.max(0, Math.ceil(seconds)));
  }, []);

  return { secondsLeft, start };
}
