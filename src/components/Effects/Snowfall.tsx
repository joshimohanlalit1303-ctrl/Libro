"use client";

import { useEffect, useRef } from "react";

export default function Snowfall({ color = "rgba(255, 255, 255, 0.95)" }: { color?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const snowflakes: { x: number; y: number; r: number; d: number; }[] = [];
        const sparkles: { x: number; y: number; opacity: number; speed: number; }[] = [];
        const maxFlakes = 100;
        const maxSparkles = 30;

        // Initialize Snowflakes
        for (let i = 0; i < maxFlakes; i++) {
            snowflakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 3 + 1,
                d: Math.random() * maxFlakes,
            });
        }

        // Initialize Sparkles
        for (let i = 0; i < maxSparkles; i++) {
            sparkles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                opacity: Math.random(),
                speed: Math.random() * 0.02 + 0.005,
            });
        }

        function draw() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, width, height);

            // Draw Snowflakes
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < maxFlakes; i++) {
                const p = snowflakes[i];
                ctx.moveTo(p.x, p.y);
                ctx.arc(p.x, p.y, p.r * 1.2, 0, Math.PI * 2, true); // Slight 20% boost for visibility
            }
            ctx.fill();

            // Draw Sparkles (Magic Dust)
            for (let i = 0; i < maxSparkles; i++) {
                const s = sparkles[i];
                ctx.fillStyle = `rgba(255, 215, 0, ${s.opacity})`; // Gold/Yellow Magic
                ctx.beginPath();
                ctx.arc(s.x, s.y, Math.random() * 1.5 + 0.5, 0, Math.PI * 2, true);
                ctx.fill();
            }

            move();
        }

        let angle = 0;
        function move() {
            angle += 0.01;

            // Move Snow
            for (let i = 0; i < maxFlakes; i++) {
                const p = snowflakes[i];
                p.y += Math.cos(angle + p.d) + 1 + p.r / 2;
                p.x += Math.sin(angle) * 2;

                if (p.x > width + 5 || p.x < -5 || p.y > height) {
                    if (i % 3 > 0) {
                        snowflakes[i] = { x: Math.random() * width, y: -10, r: p.r, d: p.d };
                    } else {
                        if (Math.sin(angle) > 0) {
                            snowflakes[i] = { x: -5, y: Math.random() * height, r: p.r, d: p.d };
                        } else {
                            snowflakes[i] = { x: width + 5, y: Math.random() * height, r: p.r, d: p.d };
                        }
                    }
                }
            }

            // Animate Sparkles
            for (let i = 0; i < maxSparkles; i++) {
                const s = sparkles[i];
                s.opacity += s.speed;
                if (s.opacity > 1 || s.opacity < 0) s.speed = -s.speed;
                s.y -= 0.2; // Slowly float up
                if (s.y < 0) {
                    s.y = height;
                    s.x = Math.random() * width;
                }
            }
        }

        let animationFrameId: number;
        const render = () => {
            draw();
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 1, // On top of background (0), behind content (10)
            }}
        />
    );
}
