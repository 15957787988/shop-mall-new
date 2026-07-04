import type { ToolCategory } from "@/mock/tools";

export function getToolPreviewGradient(category: ToolCategory): string {
  switch (category) {
    case "ai-shoot":
      return "linear-gradient(to bottom right, #EDE9FE, #C4B5FD)";
    case "video":
      return "linear-gradient(to bottom right, #FEE2E2, #FCA5A5)";
    case "wear":
      return "linear-gradient(to bottom right, #FCE7F3, #F9A8D4)";
    case "image":
      return "linear-gradient(to bottom right, #D1FAE5, #6EE7B7)";
    case "design":
      return "linear-gradient(to bottom right, #E0E7FF, #A5B4FC)";
    default:
      return "linear-gradient(to bottom right, #F3F4F6, #D1D5DB)";
  }
}
