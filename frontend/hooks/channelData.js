import { useContext, useEffect, useState } from "react";
import { WsBufferContext, channelMerger } from "../components/WSProvider";

/**
 * A custom hook that returns a "merged" array of the last `dataWidth` data points
 * for a given channel from the WsBufferContext.
 *
 * @param {string} channel - channel name in the WsBufferContext data
 * @param {number} dataWidth - maximum number of points to keep
 * @returns {Array} an array of merged data points, limited by `dataWidth`
 */
export function useBufferedChannelData(
  channel,
  dataWidth,
  transformFn = (x) => x
) {
  const { data } = useContext(WsBufferContext);
  const [bufferedData, setBufferedData] = useState([]);

  useEffect(() => {
    const newPoints = data[channel] || [];
    setBufferedData((prevPoints) =>
      channelMerger(prevPoints, newPoints, dataWidth, transformFn)
    );
  }, [data[channel], dataWidth]);

  return bufferedData;
}

/**
 * A custom hook that returns the *latest* data point from a given channel
 * in the WsBufferContext. If transformFn is provided, it applies that
 * transform to the data before returning.
 *
 * @param {string} channel - channel name in the WsBufferContext data
 * @param {(value: any) => any} [transformFn=(x) => x] - an optional function to transform the data
 * @returns {any} - the most recent (transformed) data point, or null if none
 */
export function useLatestChannelValue(
  channel,
  defaultValue = null,
  transformFn = (x) => x
) {
  const { data } = useContext(WsBufferContext);
  const [latestValue, setLatestValue] = useState(defaultValue);

  useEffect(() => {
    // Each time data[channel] changes, we only want the very last item if it exists
    const newDataArray = data[channel] || [];
    if (newDataArray.length > 0) {
      const newestItem = newDataArray[newDataArray.length - 1];
      setLatestValue(transformFn(newestItem));
    }
  }, [data[channel], transformFn]);

  return latestValue;
}
