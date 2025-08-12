import "express-session";

declare module "express-session" {
  interface SessionData {
    chatHistory?: { role: "user" | "assistant"; content: string }[];
  }
}
