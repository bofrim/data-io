import { useEffect, useState } from "react";
import { run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { LineChart } from "../components/dataViz/lineChart";
import { Spectrogram } from "../components/dataViz/spectrogram";
import { Map, MultiMap } from "../components/dataViz/map";

// Custom MDX components mapping
const components = {
  LineChart,
  Map,
  MultiMap,
  Spectrogram,
};

const HomePage = () => {
  const [channels, setChannels] = useState({});
  const [Content, setContent] = useState(() => () => <div>Loading...</div>);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const response = await fetch("/api/layout");
        const result = await response.json();

        setChannels(result.channels || {});

        // Dynamically evaluate the compiled MDX code and inject custom components
        const mdxModule = await run(result.compiledMdx, {
          ...runtime,
          components, // Pass components to the MDX runtime
        });

        setContent(() => mdxModule.default); // The default export is the React component
      } catch (error) {
        console.error("Failed to load layout:", error);
      }
    };

    fetchLayout();
  }, []);

  return (
    <div>
      <Content components={components} />{" "}
      {/* Pass components again at render */}
    </div>
  );
};

export default HomePage;
