'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AutoRefreshCountdownProps {
  /** Interval in seconds between refreshes */
  intervalSeconds?: number
  /** Callback fired on each refresh */
  onRefresh: () => void | Promise<void>
  /** Whether auto-refresh is initially enabled */
  defaultEnabled?: boolean
  /** Compact mode — just the ring, no label */
  compact?: boolean
}

/**
 * Auto-refresh toggle with a visible countdown ring.
 * Pauses when the tab is hidden and resumes on focus.
 */
export function AutoRefreshCountdown({
  intervalSeconds = 30,
  onRefresh,
  defaultEnabled = true,
  compact = false,
}: AutoRefreshCountdownProps) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  const [remaining, setRemaining] = useState(intervalSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  const reset = useCallback(() => {
    setRemaining(intervalSeconds)
  }, [intervalSeconds])

  const fire = useCallback(() => {
    onRefreshRef.current()
    reset()
  }, [reset])

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    reset()
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          onRefreshRef.current()
          return intervalSeconds
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [enabled, intervalSeconds, reset])

  // Pause when tab hidden, resume + fire on visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        fire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [enabled, fire])

  const progress = enabled ? remaining / intervalSeconds : 0
  const circumference = 2 * Math.PI * 8 // radius 8
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setEnabled(!enabled)}
        className="relative flex items-center justify-center w-7 h-7 rounded-md hover:bg-secondary transition-colors group"
        title={enabled ? `Auto-refresh in ${remaining}s (click to disable)` : 'Auto-refresh disabled (click to enable)'}
      >
        {/* Background ring */}
        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor"
            className="text-border" strokeWidth="1.5" />
          {enabled && (
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor"
              className="text-primary transition-all duration-1000 ease-linear"
              strokeWidth="1.5" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" />
          )}
        </svg>
        {/* Center icon */}
        {enabled ? (
          <span className="absolute text-[8px] font-mono font-bold text-primary">{remaining}</span>
        ) : (
          <span className="absolute text-[9px] text-muted-foreground group-hover:text-foreground">⏸</span>
        )}
      </button>
      {!compact && (
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          {enabled ? `${remaining}s` : 'Paused'}
        </span>
      )}
    </div>
  )
}
