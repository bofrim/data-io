// utils/parseLayoutFile.js
import fs from "fs";
import matter from "gray-matter";

export const parseLayoutFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const { data: channels, content: mdxContent } = matter(content); // Parse YAML frontmatter
  return { channels, mdxContent };
};
