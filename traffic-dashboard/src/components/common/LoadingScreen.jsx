import React, { useEffect } from 'react';

export default function LoadingScreen({ isExiting, onComplete }) {
    const LOGO_URL = "https://cib.go.th/backend/uploads/medium_logo_cib_4_2x_9f2da10e9f_a7828c9ca0.png";

    // Handle animation completion
    useEffect(() => {
        if (isExiting) {
            const timer = setTimeout(() => {
                onComplete && onComplete();
            }, 750); // Match animation duration roughly (0.8s)
            return () => clearTimeout(timer);
        }
    }, [isExiting, onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center animate-gradient-bg transition-opacity duration-1000 ${isExiting ? 'animate-warp-out' : ''}`}>

            {/* Logo Container with Running Glow Border */}
            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Rotating Glow Ring */}
                <div className="absolute inset-0 rounded-full glow-border-container">
                    {/* The pseudo-element in CSS handles the spinning conic gradient */}
                </div>

                {/* Logo Image */}
                <div className="absolute inset-1 rounded-full bg-slate-950 flex items-center justify-center z-10 p-4">
                    <img
                        src={LOGO_URL}
                        alt="CIB Logo"
                        className="w-full h-full object-contain animate-pulse-logo"
                    />
                </div>
            </div>

            {/* Loading Text */}
            <div className={`mt-8 flex flex-col items-center gap-2 transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                    ศูนย์ปฏิบัติการจราจร บก.ทล.
                </h2>
                <div className="flex items-center gap-1 text-slate-400 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
                    <span>กำลังโหลดข้อมูล...</span>
                </div>
            </div>

        </div>
    );
}
