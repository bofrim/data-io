import { MDXProvider } from "@mdx-js/react";
import { RedisSSEProvider } from "../components/RedisSSEProvider";
import { WsBufferProvider } from "../components/WSProvider";
import { Map, MultiMap } from "../components/dataViz/map";
import { LineChart } from "../components/dataViz/lineChart";
import { Spectrogram } from "../components/dataViz/spectrogram";
import { MatrixImage } from "../components/dataViz/matrixImage";
import { useEffect, useState, useMemo } from "react";

// Custom components mapping for MDX
const components = {
  LineChart,
  Map,
  MultiMap,
  Spectrogram,
};

function MyApp({ Component, pageProps }) {
  const [channels, setChannels] = useState({});
  const [mdxContent, setMdxContent] = useState("");

  useEffect(() => {
    // Fetch layout data from the API route
    const fetchLayoutData = async () => {
      try {
        const response = await fetch("/api/layout");
        const result = await response.json();
        setChannels((prevChannels) =>
          JSON.stringify(prevChannels) === JSON.stringify(result.channels)
            ? prevChannels
            : result.channels || {}
        );
        setMdxContent(result.mdxContent || "");
      } catch (error) {
        console.error("Failed to fetch layout data:", error);
      }
    };

    fetchLayoutData();
  }, []);

  const memoizedChannels = useMemo(() => Object.keys(channels), [channels]);

  return (
    <WsBufferProvider channels={memoizedChannels}>
      <MDXProvider components={components}>
        <Component {...pageProps} />
      </MDXProvider>
    </WsBufferProvider>
  );
}

export default MyApp;
