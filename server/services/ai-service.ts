import dotenv from "dotenv";
import fetch from "node-fetch";
import { Question, ChatMessage } from "@shared/schema";
import { hybridSearch, buildContext } from "./vector-store";

dotenv.config();

export class AIService {
  private azureApiKey: string;
  private baseUrl: string;
  private maxRetries = 3;
  private retryDelayMs = 300;
  private maxContextLength = 4000;

  constructor() {
    this.azureApiKey = process.env.AZURE_OPENAI_API_KEY || "";
    const instanceName = process.env.AZURE_OPENAI_API_INSTANCE_NAME;
    const deploymentName = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

    if (!this.azureApiKey) throw new Error("AZURE_OPENAI_API_KEY is required");
    if (!instanceName) throw new Error("AZURE_OPENAI_API_INSTANCE_NAME is required");
    if (!deploymentName) throw new Error("AZURE_OPENAI_API_DEPLOYMENT_NAME is required");

    this.baseUrl = `https://${instanceName}.openai.azure.com/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
  }

  private checkApiKey() {
    if (!this.azureApiKey) throw new Error("AZURE_OPENAI_API_KEY is required");
  }

  async generateAnswer(question: string, history: (Question | ChatMessage)[] = []): Promise<{ answer: string; sources: string[] }> {
    this.checkApiKey();

    if (!question?.trim()) {
      return { answer: "Invalid question provided", sources: [] };
    }

    const retrieved = await hybridSearch(question, 6, 40, 0.7);
    const { context, sources } = buildContext(retrieved, this.maxContextLength);

    const historyContext = history
      .map(item => `User: ${item.text || item.message}\nAI: ${item.answer || item.response || "No response"}`)
      .join("\n\n");

    const prompt = `
You are an expert in compliance and policy enforcement at Netradyne, but you can also engage in natural conversation. Follow these instructions based on the input:

1. **Greetings**: If the input is a greeting (e.g., "Hello", "Hi", "Good morning", "How are you"), respond with a friendly, concise reply. Examples:
   - For "Hello" or "Hi": "Hello! How can I assist you today?"
   - For "How are you": "I'm doing great, thanks for asking! How about you?"
   Do not use the provided document context for greetings.

2. **Compliance and Policy Questions**: If the input is a question related to compliance, policy, or Netradyne-specific topics, answer strictly based on the provided document context. The response should be clear, authoritative, and focused solely on providing the most relevant and accurate answer. Do not mention the documents, sections, or sources in the answer. Do not include the question or any prefixes in the response. Just provide the answer. If the context does not contain relevant information, respond with: "I'm sorry, I don't have enough information to answer this question." If the answer is a direct "YES" or "NO," provide a concise explanation based on the context. For all other cases, provide a detailed and accurate response based on the context.

3. **General Knowledge Questions**: If the input is a general question (e.g., "What is AI?", "Explain machine learning") and the provided document context is not relevant or sufficient, use your general knowledge to provide a clear, accurate, and concise answer. Ensure the response is professional, user-friendly, and formatted for business use. Do not mention the lack of context or sources.

4. **Follow-up Questions**: Use the conversation history to maintain context for follow-up questions. The history includes previous questions/messages and their answers/responses. Ensure responses are consistent with prior interactions and leverage the history to provide coherent and context-aware answers.

Ensure all responses are comprehensive, user-friendly, and professionally formatted for business use.

Conversation History:
${historyContext}

Document Context:
${context}

Input: ${question}
`.trim();

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "api-key": this.azureApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          if (response.status === 429 && attempt < this.maxRetries) {
            await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
            continue;
          }
          throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || "No response generated";
        return { answer, sources };
      } catch (err) {
        if (attempt === this.maxRetries) {
          return {
            answer: "Error generating answer - please try again.",
            sources: [],
          };
        }
      }
    }

    return { answer: "Unexpected error", sources: [] };
  }

  async processQuestions(questions: Question[]): Promise<Question[]> {
    this.checkApiKey();
    const processed: Question[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text?.trim()) {
        processed.push({ ...q, status: "failed", answer: "Invalid question provided", sources: [] });
        continue;
      }
      try {
        if (i > 0) await new Promise((r) => setTimeout(r, this.retryDelayMs));
        const previousQuestions = processed.slice(0, i);
        const { answer, sources } = await this.generateAnswer(q.text, previousQuestions);
        processed.push({ ...q, status: "completed", answer, sources });
      } catch {
        processed.push({
          ...q,
          status: "failed",
          answer: "Error generating answer - please try regenerating this question",
          sources: [],
        });
      }
    }
    return processed;
  }

  async generateChatResponse(message: string, history: ChatMessage[]): Promise<{ answer: string; sources: string[] }> {
    return this.generateAnswer(message, history);
  }
}