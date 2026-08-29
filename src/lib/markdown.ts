import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypeResponsiveImages } from "@/lib/rehype-responsive-images";

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeResponsiveImages)
  .use(rehypeStringify);

export async function markdownToHtml(markdown: string) {
  return String(await markdownProcessor.process(markdown));
}
