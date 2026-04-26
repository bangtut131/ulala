import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Auto-logout hook: logs user out after a period of inactivity.
 * Tracks mouse, keyboard, scroll, touch, and click events.
 * 
 * @param {Object} options
 * @param {number} options.timeoutMs - Inactivity timeout in milliseconds (default: 10 minutes)
 * @param {number} options.warningMs - Show warning this many ms before logout (default: 60 seconds)
 * @param {Function} options.onLogout - Callback when auto-logout triggers
 * @param {string} options.tokenKey - localStorage key for the auth token
 */
export default function useAutoLogout({
    timeoutMs = 10 * 60 * 1000, // 10 minutes
    warningMs = 60 * 1000,      // 1 minute warning
    onLogout,
    tokenKey = 'adminToken'
}) {
    const timerRef = useRef(null);
    const warningTimerRef = useRef(null);
    const [showWarning, setShowWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const countdownRef = useRef(null);

    const clearAllTimers = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    }, []);

    const handleLogout = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        localStorage.removeItem(tokenKey);
        if (onLogout) onLogout();
    }, [clearAllTimers, tokenKey, onLogout]);

    const resetTimer = useCallback(() => {
        // Don't reset if there's no token (already logged out)
        if (!localStorage.getItem(tokenKey)) return;

        clearAllTimers();
        setShowWarning(false);

        // Set warning timer (fires warningMs before logout)
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setRemainingSeconds(Math.ceil(warningMs / 1000));

            // Start countdown
            countdownRef.current = setInterval(() => {
                setRemainingSeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, timeoutMs - warningMs);

        // Set actual logout timer
        timerRef.current = setTimeout(() => {
            handleLogout();
        }, timeoutMs);
    }, [clearAllTimers, timeoutMs, warningMs, tokenKey, handleLogout]);

    const stayActive = useCallback(() => {
        resetTimer();
    }, [resetTimer]);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        // Throttle to avoid excessive timer resets
        let lastReset = Date.now();
        const throttledReset = () => {
            const now = Date.now();
            if (now - lastReset > 5000) { // Only reset every 5 seconds max
                lastReset = now;
                resetTimer();
            }
        };

        // Initial timer start
        resetTimer();

        // Attach activity listeners
        events.forEach(event => {
            document.addEventListener(event, throttledReset, { passive: true });
        });

        return () => {
            clearAllTimers();
            events.forEach(event => {
                document.removeEventListener(event, throttledReset);
            });
        };
    }, [resetTimer, clearAllTimers]);

    return { showWarning, remainingSeconds, stayActive };
}
