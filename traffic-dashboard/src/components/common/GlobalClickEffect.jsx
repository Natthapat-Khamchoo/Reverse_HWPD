import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const GlobalClickEffect = () => {
    const [ripples, setRipples] = useState([]);

    useEffect(() => {
        const handleClick = (e) => {
            // Create a unique ID for each ripple
            const id = Date.now();
            const x = e.clientX;
            const y = e.clientY;

            setRipples((prev) => [...prev, { id, x, y }]);

            // Remove the ripple after animation completes (e.g., 600ms)
            setTimeout(() => {
                setRipples((prev) => prev.filter((r) => r.id !== id));
            }, 600);
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Portal to body to ensure it's always on top and not clipped
    return ReactDOM.createPortal(
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {ripples.map((ripple) => (
                <span
                    key={ripple.id}
                    className="absolute rounded-full bg-white animate-click-ripple"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            ))}
        </div>,
        document.body
    );
};

export default GlobalClickEffect;
