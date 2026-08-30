export type PostContentType = "TEXT" | "MARKDOWN";

export type CreateStructuredPostInput = {
  content: string;
  image?: string | null;
  contentType?: PostContentType;
};
