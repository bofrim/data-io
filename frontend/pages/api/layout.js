import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";

export default async function handler(req, res) {
  const layoutFilePath = path.join(process.cwd(), "layout.mdx");

  try {
    // Read the MDX file
    const fileContent = fs.readFileSync(layoutFilePath, "utf-8");
    const { data: config, content: mdxContent } = matter(fileContent);

    // Compile the MDX content to a JavaScript function
    const compiledMdx = String(
      await compile(mdxContent, { outputFormat: "function-body" })
    );

    const channels = config.channels;
    res.status(200).json({ channels, compiledMdx });
  } catch (error) {
    res.status(500).json({ error: "Failed to parse layout file." });
  }
}
