import { defaultSchema } from "rehype-sanitize";

export const postSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "del", "s", "sub", "sup",
    "blockquote",
    "ul", "ol", "li",
    "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div",
    "svg", "path", "line", "circle", "rect", "polyline", "polygon", "g", "defs", "use",
    "math", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mroot", "mtext", "annotation"
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": ["className", "class", "style", "ariaHidden", "aria-hidden", "role"],
    a: ["href", "target", "rel", "title"],
    code: ["className", "class"],
    span: ["className", "class", "style"],
    div: ["className", "class", "style"],
    svg: ["className", "class", "style", "viewBox", "width", "height", "fill", "xmlns", "aria-hidden"],
    path: ["d", "fill", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin"],
    th: ["align", "scope"],
    td: ["align"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
};
