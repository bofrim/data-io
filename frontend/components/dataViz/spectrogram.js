import React, { useEffect, useRef } from "react";
import { useBufferedChannelData } from "../../hooks/channelData";

export const Spectrogram = ({
  channel,
  title,
  dataWidth = 200, // Number of historical time slices to show
  canvasHeight = 200,
}) => {
  const canvasRef = useRef(null);
  const allDataPoints = useBufferedChannelData(channel, dataWidth);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    if (allDataPoints.length > 0) {
      const timeSliceWidth = width / dataWidth; // Width of each time slice
      const binHeight = height / allDataPoints[0].frequencies.length; // Height of each frequency bin

      // Render the historical spectrogram
      allDataPoints.forEach(({ amplitudes }, timeIndex) => {
        amplitudes.forEach((amplitude, freqIndex) => {
          // Map amplitude to color
          const mapToColor = (value) => {
            const r = Math.floor(value * 255); // Red channel increases with value
            const g = Math.floor((1 - value) * 255); // Green channel decreases with value
            const b = 150; // Fixed blue channel for contrast
            return `rgb(${r}, ${g}, ${b})`;
          };

          const color = mapToColor(amplitude);
          ctx.fillStyle = color;

          ctx.fillRect(
            timeIndex * timeSliceWidth, // x-coordinate (progress over time)
            height - (freqIndex + 1) * binHeight, // y-coordinate (top of bin)
            timeSliceWidth, // Width of the time slice
            binHeight // Height of the frequency bin
          );
        });
      });
    }
  }, [allDataPoints, dataWidth]);

  // Adjust canvas size dynamically
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      canvas.width = parent.offsetWidth; // Full parent width
      canvas.height = canvasHeight; // Set to the specified height
    };

    resizeCanvas(); // Resize on mount
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [canvasHeight]);

  return (
    <div>
      <h3>{title}</h3>
      <canvas ref={canvasRef} />
    </div>
  );
};
