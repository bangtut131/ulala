import React, { useEffect, useRef, useState } from 'react';

export default function ProctorCamera({ candidateId = null, onCapture = null, phase = 'test', intervalMs = 60000 }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        let stream = null;
        let captureInterval = null;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setPermissionDenied(false);

                // Initial snapshot after 3 seconds
                setTimeout(() => {
                    captureSnapshot();
                }, 3000);

                // Start capturing Loop
                captureInterval = setInterval(() => {
                    captureSnapshot();
                }, intervalMs + (Math.random() * 10000)); // Add some randomness

            } catch (err) {
                console.error("Camera permission denied:", err);
                setPermissionDenied(true);
            }
        };

        startCamera();

        return () => {
            if (captureInterval) clearInterval(captureInterval);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const captureSnapshot = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas size to video size
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        if (canvas.width === 0 || canvas.height === 0) return; // Video not ready

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Compress webp to save bandwidth
        const base64Image = canvas.toDataURL('image/webp', 0.5);

        if (candidateId) {
            // Live upload
            try {
                await fetch(`/api/candidates/${candidateId}/snapshot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64Image, phase })
                });
            } catch (error) {
                console.error("Live snapshot upload failed", error);
            }
        } else if (onCapture) {
            // Accumulate in parent state
            onCapture(base64Image);
        }
    };

    return (
        <>
            <div className="fixed top-4 right-4 z-50 bg-slate-900/80 backdrop-blur-md rounded-xl p-3 shadow-2xl flex items-center gap-3 border border-white/10 pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    <span className="text-white text-xs font-bold tracking-wider">PROCTORING</span>
                </div>
                <div className="w-16 h-12 rounded overflow-hidden border border-white/5 opacity-70">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

            {permissionDenied && (
                <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
                    <div className="bg-red-500/20 p-6 rounded-full mb-6">
                        <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Akses Kamera Diperlukan</h2>
                    <p className="text-slate-300 max-w-xl mb-8 text-lg leading-relaxed">
                        Anda wajib mengizinkan akses kamera untuk melanjutkan pengisian biodata dan tes tahap selanjutnya. Sistem secara berkala akan mendeteksi presensi wajah Anda untuk mencegah aktivitas fraud/berjoki. 
                        Silakan <strong>izinkan akses kamera</strong> di pengaturan perizinan browser Anda dan *refresh* halaman ini.
                    </p>
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/50">
                        Refresh Halaman
                    </button>
                </div>
            )}
        </>
    );
}
