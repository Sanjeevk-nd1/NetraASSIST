import dotenv from "dotenv";
import { Question } from "@shared/schema";
import { storage } from "../storage";

dotenv.config();

export class AIService {
  private groqApiKey: string;
  private baseUrl = "https://api.openai.com/v1/chat/completions"; // openAPI URL
  private maxRetries = 3;
  private retryDelayMs = 3000;
  private maxContextLength = 4000;

  constructor() {
    this.groqApiKey = process.env.OPENAI_API_KEY || ""; // openAPI env var name
    if (!this.groqApiKey) {
      console.error("OPENAI_API_KEY environment variable is missing");
      throw new Error("OPENAI_API_KEY is required");
    }
  }

  private checkApiKey() {
    if (!this.groqApiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
  }

  async generateAnswer(question: string, context: string = ""): Promise<{ answer: string; sources: string[] }> {
    this.checkApiKey();

    if (!question.trim()) {
      console.error("Empty or invalid question provided");
      return { answer: "Invalid question provided", sources: [] };
    }

    const truncatedContext =
      context.length > this.maxContextLength ? context.substring(0, this.maxContextLength) + "..." : context;

    const prompt = `
You are an expert in compliance and policy enforcement at Netradyne, but you can also engage in natural conversation. Follow these instructions based on the input:

1. **Greetings**: If the input is a greeting (e.g., "Hello", "Hi", "Good morning", "How are you"), respond with a friendly, concise reply. Examples:
   - For "Hello" or "Hi": "Hello! How can I assist you today?"
   - For "How are you": "I'm doing great, thanks for asking! How about you?"
   Do not use the provided context for greetings.

2. **Compliance and Policy Questions**: If the input is a question related to compliance, policy, or Netradyne-specific topics, answer strictly based on the provided context from uploaded documents. The response should be clear, authoritative, and focused solely on providing the most relevant and accurate answer. Do not mention the documents, sections, or sources in the answer. Do not include the question or any prefixes in the response. Just provide the answer. If the context does not contain relevant information, respond with: "I'm sorry, I don't have enough information to answer this question." If the answer is a direct "YES" or "NO," provide a concise explanation based on the context. For all other cases, provide a detailed and accurate response based on the context.

3. **General Knowledge Questions**: If the input is a general question (e.g., "What is AI?", "Explain machine learning") and the provided context is not relevant or sufficient, use your general knowledge to provide a clear, accurate, and concise answer. Ensure the response is professional, user-friendly, and formatted for business use. Do not mention the lack of context or sources.

Ensure all responses are comprehensive, user-friendly, and professionally formatted for business use.

Context: ${truncatedContext}

Input: ${question}
`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} for question: ${question.substring(0, 50)}...`);
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          if (response.status === 429 && attempt < this.maxRetries) {
            console.warn(
              `Rate limit hit on attempt ${attempt} for question: ${question.substring(0, 50)}... Retrying after ${this.retryDelayMs}ms`
            );
            await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * attempt));
            continue;
          }
          throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const answer = data.choices[0]?.message?.content || "No response generated";
        const sources = context ? this.extractSources(context) : [];

        return { answer, sources };
      } catch (error) {
        console.error(`Attempt ${attempt} failed for question "${question.substring(0, 50)}...":`, error);
        if (attempt === this.maxRetries) {
          throw new Error(
            `Failed to generate answer after ${this.maxRetries} attempts: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    }

    throw new Error("Unexpected error in generateAnswer");
  }

  private extractSources(context: string): string[] {
    const sentences = context.split(".").filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim() + ".");
  }

  async processQuestions(questions: Question[]): Promise<Question[]> {
    this.checkApiKey();

    const context = await this.loadTrainingContext();
    const processedQuestions: Question[] = [];

    if (!context) {
      console.warn("No context available; answers may be limited");
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.text?.trim()) {
        console.error(`Skipping invalid question at index ${i}: ${JSON.stringify(question)}`);
        processedQuestions.push({
          ...question,
          status: "failed",
          answer: "Invalid question provided",
          sources: [],
        });
        continue;
      }

      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
        }

        console.log(`Processing question ${i + 1}/${questions.length}: ${question.text.substring(0, 50)}...`);
        const result = await this.generateAnswer(question.text, context);
        processedQuestions.push({
          ...question,
          answer: result.answer,
          sources: result.sources,
          status: "completed",
        });
      } catch (error) {
        console.error(`Error processing question ${i + 1}: ${question.text.substring(0, 50)}...`, error);
        processedQuestions.push({
          ...question,
          status: "failed",
          answer: "Error generating answer - please try regenerating this question",
          sources: [],
        });
      }
    }

    return processedQuestions;
  }

  private async loadTrainingContext(): Promise<string> {
    try {
      const documents = await storage.getAllDocuments();
      if (!documents || documents.length === 0) {
        console.warn("No documents found in rfpd database");
        return "";
      }

      let context = "";
      for (const doc of documents) {
        if (!doc.content) {
          console.warn(`Document ${doc.id} has no content`);
          continue;
        }
        context += `${doc.content}\n\n`;
      }

      if (context.length > this.maxContextLength) {
        context = context.substring(0, this.maxContextLength) + "...";
      }

      console.log(`Loaded context from ${documents.length} documents, length: ${context.length} characters`);
      return context.trim();
    } catch (error) {
      console.error("Error loading training context from rfpd:", error);
      return "";
    }
  }

  async generateChatResponse(message: string, context: string = ""): Promise<{ answer: string; sources: string[] }> {
    return this.generateAnswer(message, context);
  }
}