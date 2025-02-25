import React, { useEffect, useRef } from "react";
import { useBufferedChannelData } from "../../hooks/channelData";

export const LineChart = ({ channel, title, dataWidth = 100 }) => {
  const allDataPoints = useBufferedChannelData(channel, dataWidth);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw the chart if there is data
    if (allDataPoints.length > 0) {
      const maxValue = Math.max(...allDataPoints);
      const minValue = Math.min(...allDataPoints);

      const normalize = (value) =>
        ((value - minValue) / (maxValue - minValue)) * height;

      ctx.beginPath();
      ctx.moveTo(0, height - normalize(allDataPoints[0]));

      allDataPoints.forEach((point, index) => {
        const x = (index / (allDataPoints.length - 1)) * width;
        const y = height - normalize(point);
        ctx.lineTo(x, y);
      });

      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [allDataPoints]);

  // Adjust canvas size to full width of the parent
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      canvas.width = parent.offsetWidth; // Set canvas width to parent width
      canvas.height = 200; // Set a fixed height (can be dynamic if needed)
    };

    resizeCanvas(); // Resize on mount
    window.addEventListener("resize", resizeCanvas); // Resize on window resize

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div>
      <h3>{title}</h3>
      <canvas ref={canvasRef} />
    </div>
  );
};
