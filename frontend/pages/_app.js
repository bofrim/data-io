import { MDXProvider } from "@mdx-js/react";
import { RedisProvider } from "../components/RedisDataContext";
import { RedisSSEProvider } from "../components/RedisSSEProvider";
import { LineChart, Map, ImageFrame } from "../components/components";
import { useEffect, useState } from "react";

// Custom components mapping for MDX
const components = {
  LineChart,
  Map,
  ImageFrame,
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
        setChannels(result.channels || {});
        setMdxContent(result.mdxContent || "");
      } catch (error) {
        console.error("Failed to fetch layout data:", error);
      }
    };

    fetchLayoutData();
  }, []);

  return (
    <RedisSSEProvider channels={Object.keys(channels)}>
      {/* <RedisProvider channels={channels}> */}
      <MDXProvider components={components}>
        <div dangerouslySetInnerHTML={{ __html: mdxContent }} />
        <Component {...pageProps} />
      </MDXProvider>
      {/* </RedisProvider> */}
    </RedisSSEProvider>
  );
}

export default MyApp;
