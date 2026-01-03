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

    // Generate Traffic Flow Streams (Simulate cars on highway)
    const trafficStreams = [...Array(40)].map((_, i) => { // Increased count slightly
        const isLeft = Math.random() > 0.5; // Left lane (Red/Tail) vs Right lane (White/Head)
        const color = isLeft ? 'bg-red-500' : 'bg-cyan-200';
        const shadowColor = isLeft ? 'red' : 'cyan';

        return {
            id: i,
            className: `${color}`,
            shadowColor: shadowColor,
            // Widen the spread significantly: -50% to 150% to prevent center clustering in perspective
            left: `${-50 + Math.random() * 200}%`,
            width: Math.random() > 0.8 ? 'w-1' : 'w-0.5', // Random streak width
            delay: `${Math.random() * 2}s`,
            duration: `${0.5 + Math.random() * 1.5}s` // Varied speed
        };
    });

    return (
        <div className={`fixed inset-0 z-[9999] bg-[#050B14] overflow-hidden flex flex-col items-center justify-center ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'} transition-all duration-700 ease-in-out animate-police-pulse`}>

            {/* 1. Background Starfield/Static Noise */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,30,60,0.5),_transparent_80%)]"></div>

            {/* 2. The Digital Tunnel (Infinite Grid - Floor & Ceiling) */}
            <div className="absolute inset-0 perspective-[600px] overflow-hidden">

                {/* Floor Plane with Traffic */}
                <div className="absolute bottom-0 left-0 w-full h-[50%] origin-bottom transform-3d rotate-x-[60deg]">
                    <div className="absolute -inset-[100%] bg-[linear-gradient(to_right,rgba(6,182,212,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.15)_1px,transparent_1px)] bg-[size:80px_80px] animate-grid-move">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-transparent to-transparent"></div>
                    </div>

                    {/* Traffic Streams on Floor */}
                    {trafficStreams.map(stream => (
                        <div
                            key={`floor-${stream.id}`}
                            className={`absolute top-0 h-[200px] ${stream.width} ${stream.className} opacity-0 animate-traffic-flow blur-[1px]`}
                            style={{
                                left: stream.left,
                                boxShadow: `0 0 10px ${stream.shadowColor}`,
                                animationDelay: stream.delay,
                                animationDuration: stream.duration
                            }}
                        />
                    ))}
                </div>

                {/* Ceiling Plane (Mirrored) */}
                <div className="absolute top-0 left-0 w-full h-[50%] origin-top transform-3d rotate-x-[-60deg]">
                    <div className="absolute -inset-[100%] bg-[linear-gradient(to_right,rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:80px_80px] animate-grid-move">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14] via-transparent to-transparent"></div>
                    </div>

                    {/* Traffic Streams on Ceiling (Reflection effect) */}
                    {trafficStreams.map(stream => (
                        <div
                            key={`ceil-${stream.id}`}
                            className={`absolute bottom-0 h-[200px] ${stream.width} ${stream.className} opacity-0 animate-traffic-flow blur-[2px]`}
                            style={{
                                left: stream.left,
                                boxShadow: `0 0 10px ${stream.shadowColor}`,
                                animationDelay: stream.delay,
                                animationDuration: stream.duration,
                                opacity: 0.3 // Dimmer reflection
                            }}
                        />
                    ))}
                </div>

                {/* Center Glow (Source) */}
                <div className="absolute top-[48%] left-0 w-full h-[4%] bg-cyan-500/20 blur-[60px] pointer-events-none"></div>
            </div>

            {/* 3. Central Tech HUD (Logo) */}
            <div className="relative z-20 flex flex-col items-center -mt-8">

                {/* HUD Circle Container */}
                <div className="relative w-48 h-48 lg:w-64 lg:h-64 mb-10 group">
                    {/* Outer Rotating Metric Rings */}
                    <div className="absolute -inset-4 border border-cyan-500/20 rounded-full animate-spin [animation-duration:10s]"></div>
                    <div className="absolute -inset-2 border-t-2 border-r-2 border-b-2 border-transparent border-t-blue-500/50 border-r-blue-400/30 rounded-full animate-spin [animation-duration:3s]"></div>

                    {/* Inner Circle Glow */}
                    <div className="absolute inset-0 bg-slate-900/90 rounded-full flex items-center justify-center border border-slate-700/50 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden">
                        {/* Scanline passing over logo */}
                        <div className="absolute inset-0 h-[200%] w-full bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-scanline z-20 pointer-events-none opacity-50"></div>

                        <img
                            src={LOGO_URL}
                            alt="CIB Logo"
                            className="w-[75%] h-[75%] object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        />
                    </div>

                    {/* Bottom Status Indicator */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                        <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-8 h-1 bg-cyan-900/50 rounded-full overflow-hidden">
                                    <div className={`h-full bg-cyan-400 animate-[loading_1.5s_ease-in-out_infinite]`} style={{ animationDelay: `${i * 0.2}s` }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-1 relative z-30">
                    <h2 className="text-3xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-blue-200 tracking-tight drop-shadow-lg font-display uppercase">
                        TRAFFIC CONTROL
                    </h2>
                    <div className="text-cyan-400/60 text-sm tracking-[0.5em] font-mono uppercase bg-black/40 px-4 py-1 rounded inline-block border border-cyan-900/30 backdrop-blur-sm">
                        Operation Center
                    </div>
                </div>
            </div>

            {/* 4. Vignette Overlay */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,11,20,0.8)_100%)] z-40"></div>
        </div>
    );
}
