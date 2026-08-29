import {
  CONTENT_IMAGE_SIZES,
  getResponsiveSourceSet,
  supportsResponsiveImage,
} from "@/lib/responsive-images.mjs";

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export function rehypeResponsiveImages() {
  return (tree: HastNode) => {
    visit(tree);
  };
}

function visit(node: HastNode) {
  if (node.type === "element" && node.tagName === "img") {
    const properties = node.properties ?? (node.properties = {});
    const source = properties.src;

    if (supportsResponsiveImage(source)) {
      properties.srcSet = getResponsiveSourceSet(source);
      properties.sizes ??= CONTENT_IMAGE_SIZES;
      properties.loading ??= "lazy";
      properties.decoding ??= "async";
    }
  }

  for (const child of node.children ?? []) visit(child);
}
