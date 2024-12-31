// components/components.js
import React, { useContext, useEffect, useRef, useState } from "react";
import { RedisSSEContext } from "./RedisSSEProvider";

export const LineChart = ({ channel, title, dataWidth = 100 }) => {
  const data = useContext(RedisSSEContext);
  const [allDataPoints, setAllDataPoints] = useState([]); // Store all past data points
  const canvasRef = useRef(null);
  const dataWidthInt = +dataWidth;

  useEffect(() => {
    // Append new data points when the channel data changes
    if (data[channel]) {
      setAllDataPoints((prevData) => [
        ...prevData.slice(-1 * dataWidthInt),
        data[channel],
      ]);
    }
  }, [data[channel]]);

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

export const Map = () => {
  const data = useContext(RedisSSEContext);
  const position = data["position"] || { lat: 0, lon: 0 };
  const canvasRef = useRef(null);
  const positionsRef = useRef([]); // To store the last 100 positions

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Load the map image
    const mapImage = new Image();
    mapImage.src =
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg"; // A simple world map
    mapImage.onload = () => {
      // Update positions
      const newPositions = [...positionsRef.current, position].slice(-100);
      positionsRef.current = newPositions;

      // Clear the canvas and draw the map
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(mapImage, 0, 0, width, height);

      // Helper function to convert lat/lon to x/y
      const latLonToXY = (lat, lon) => ({
        x: ((lon + 180) / 360) * width,
        y: ((90 - lat) / 180) * height,
      });

      // Draw previous positions as grey dots
      newPositions.forEach(({ lat, lon }) => {
        if (lat === 0 && lon === 0) return; // Skip the initial position
        const { x, y } = latLonToXY(lat, lon);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI); // Small grey dot
        ctx.fillStyle = "red";
        ctx.fill();
      });

      // Draw the current position as a blue crosshair
      const { x, y } = latLonToXY(position.lat, position.lon);
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;

      // Draw horizontal line
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.stroke();

      // Draw vertical line
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    };
  }, [position]);

  return (
    <div>
      <h3>Map Component</h3>
      <p>Latitude: {position.lat}</p>
      <p>Longitude: {position.lon}</p>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{ border: "1px solid black" }}
      />
    </div>
  );
};

export const ImageFrame = ({ channel }) => {
  const data = useContext(RedisSSEContext);
  const imageData = data[channel] || {};

  return (
    <div>
      <h3>Image Frame</h3>
      {imageData.url ? (
        <img
          src={imageData.url}
          alt="Dynamic content"
          style={{ maxWidth: "100%" }}
        />
      ) : (
        <p>No image data available.</p>
      )}
      <p>Resolution: {imageData.resolution?.join("x") || "Unknown"}</p>
      <p>Color Format: {imageData.color_format || "Unknown"}</p>
    </div>
  );
};
