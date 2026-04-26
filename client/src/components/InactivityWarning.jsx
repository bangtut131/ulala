import React from 'react';

/**
 * Floating warning banner that appears before auto-logout.
 * Shows a countdown and allows user to stay active.
 */
const InactivityWarning = ({ remainingSeconds, onStayActive }) => {
    if (!remainingSeconds || remainingSeconds <= 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-up">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-orange-500/30 flex items-center gap-4 border border-amber-400/30 backdrop-blur-lg max-w-lg">
                {/* Warning Icon */}
                <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-amber-200 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>

                {/* Message */}
                <div className="flex-1">
                    <p className="font-bold text-sm">Sesi akan berakhir</p>
                    <p className="text-amber-100 text-xs mt-0.5">
                        Auto logout dalam <span className="font-mono font-bold text-white text-sm">{remainingSeconds}</span> detik karena tidak ada aktivitas
                    </p>
                </div>

                {/* Stay Active Button */}
                <button
                    onClick={onStayActive}
                    className="flex-shrink-0 bg-white text-amber-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                    Tetap Aktif
                </button>
            </div>
        </div>
    );
};

export default InactivityWarning;
