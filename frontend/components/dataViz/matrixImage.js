import React, { useEffect, useRef } from "react";
import { useLatestChannelValue } from "../../hooks/channelData";

export const MatrixImage = ({
  channel,
  // Canvas "logical" resolution (the number of pixels drawn)
  canvasWidth = 256,
  canvasHeight = 256,
  // Display size (CSS) – how big it appears on the page
  displayWidth = 512,
  displayHeight = 512,
}) => {
  const canvasRef = useRef(null);
  // Retrieve the latest 2D matrix from the specified channel
  const matrix = useLatestChannelValue(channel, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Validate the matrix dimensions
    if (
      Array.isArray(matrix) &&
      matrix.length === canvasHeight &&
      matrix[0].length === canvasWidth
    ) {
      // Create an ImageData buffer
      const imageData = ctx.createImageData(canvasWidth, canvasHeight);
      for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
          const offset = (y * canvasWidth + x) * 4;
          const pixelValue = matrix[y][x];

          // Assign the same value to R, G, and B channels
          // and set alpha to 255 (fully opaque)
          imageData.data[offset + 0] = pixelValue; // R
          imageData.data[offset + 1] = pixelValue; // G
          imageData.data[offset + 2] = pixelValue; // B
          imageData.data[offset + 3] = 255; // A
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } else {
      // If data is invalid or not available, display a placeholder
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = "gray";
      ctx.fillText("No Data", 10, 20);
    }
  }, [matrix, canvasWidth, canvasHeight]);

  return (
    <div>
      <h3>Matrix Image</h3>
      <canvas
        ref={canvasRef}
        // Internal resolution
        width={canvasWidth}
        height={canvasHeight}
        // Display resolution (CSS)
        style={{
          border: "1px solid black",
          imageRendering: "pixelated",
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
        }}
      />
    </div>
  );
};

export default MatrixImage;
