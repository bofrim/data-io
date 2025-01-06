import React, { useContext, useEffect, useRef } from "react";
import { RedisWebSocketContext } from "../RedisWSProvider";

// Helper function to convert lat/lon to x/y coordinates on the map
const latLonToXY = (lat, lon, mapWidth, mapHeight) => {
  const x = ((lon + 180) / 360) * mapWidth; // Map longitude to x
  const y = ((90 - lat) / 180) * mapHeight; // Map latitude to y
  return { x, y };
};

// Map Component
export const Map = ({ channel }) => {
  const data = useContext(RedisWebSocketContext);
  const position = data[channel] || { lat: 0, lon: 0 };
  const canvasRef = useRef(null);
  const positionsRef = useRef([]); // To store the last 100 positions

  useEffect(() => {
    // Update historical positions when new data arrives
    const newPositions = [...positionsRef.current, position].slice(-100);
    positionsRef.current = newPositions;
  }, [position]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Load the map image
    const mapImage = new Image();
    mapImage.src =
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg";
    mapImage.onload = () => {
      // Clear the canvas and draw the map
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(mapImage, 0, 0, width, height);

      // Draw previous positions as red dots
      positionsRef.current.forEach(({ lat, lon }) => {
        if (lat === 0 && lon === 0) return; // Skip the initial position
        const { x, y } = latLonToXY(lat, lon, width, height);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI); // Small red dot
        ctx.fillStyle = "red";
        ctx.fill();
      });

      // Draw the current position as a blue crosshair
      const { x, y } = latLonToXY(position.lat, position.lon, width, height);
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
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{ border: "1px solid black" }}
      />
    </div>
  );
};

// Utility function to get color based on magnitude
const getColorByMagnitude = (magnitude) => {
  if (magnitude < 2.5) return "blue";
  if (magnitude < 4.5) return "green";
  if (magnitude < 6.0) return "orange";
  return "red"; // High magnitude
};

// Utility function to get radius based on magnitude
const getRadiusByMagnitude = (magnitude) => {
  if (typeof magnitude !== "number" || magnitude <= 0) {
    return 1; // Default to a small positive radius for invalid magnitudes
  }
  return magnitude * 3; // Scale radius by magnitude
};

// MultiMap Component
export const MultiMap = ({ channel }) => {
  const data = useContext(RedisWebSocketContext);
  const mapData = data[channel] || []; // Fetch data from the specified channel
  const canvasRef = useRef(null);

  const mapImage =
    "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg";
  const mapWidth = 800;
  const mapHeight = 400;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Load and render the map image
    const mapImageElement = new Image();
    mapImageElement.src = mapImage;

    mapImageElement.onload = () => {
      // Clear the canvas and draw the map
      ctx.clearRect(0, 0, mapWidth, mapHeight);
      ctx.drawImage(mapImageElement, 0, 0, mapWidth, mapHeight);

      // Render the data points
      mapData.forEach((point) => {
        const { lat, lon, magnitude } = point;

        // Validate data points
        if (
          typeof lat !== "number" ||
          typeof lon !== "number" ||
          typeof magnitude !== "number" ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180 ||
          magnitude <= 0
        ) {
          console.warn("Skipping invalid data point:", point);
          return;
        }

        // Convert lat/lon to canvas x/y
        const { x, y } = latLonToXY(lat, lon, mapWidth, mapHeight);
        const color = getColorByMagnitude(magnitude);
        const radius = getRadiusByMagnitude(magnitude);

        // Draw a circle for the data point
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      });
    };
  }, [mapData]);

  return (
    <div>
      <h3>MultiMap Component</h3>
      <canvas
        ref={canvasRef}
        width={mapWidth}
        height={mapHeight}
        style={{ display: "block", border: "1px solid black" }}
      />
    </div>
  );
};

export default MultiMap;
