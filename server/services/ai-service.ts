import { Question } from "@shared/schema";

export class AIService {
  private groqApiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || "";
  }

  private checkApiKey() {
    if (!this.groqApiKey) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }
  }

  async generateAnswer(question: string, context: string = ""): Promise<{ answer: string; sources: string[] }> {
    this.checkApiKey();
    
    const prompt = `
You are an expert in compliance and policy enforcement in Netradyne. Answer the question strictly based on the knowledge in the provided documents. 
Your response should be clear, authoritative, and focused solely on providing the most relevant and accurate answer.
Avoid mentioning the documents, sections, or any sources. Do not include the question or any prefixes in your response. Just provide the answer.
If the context does not contain relevant information, respond with: "I'm sorry, I don't have enough information to answer this question"
If the answer to the question is a direct "YES" or "NO," provide a concise explanation of the reason for that answer, based on the context.
For all other cases, provide a detailed and accurate response based on the context.

Context: ${context}

Question: ${question}
`;

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content || "No response generated";
      
      // Extract source information from context
      const sources = context ? this.extractSources(context) : [];
      
      return { answer, sources };
    } catch (error) {
      console.error("Error generating answer:", error);
      throw new Error("Failed to generate answer");
    }
  }

  private extractSources(context: string): string[] {
    // Extract meaningful source snippets from context
    const sentences = context.split('.').filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim() + '.');
  }

  async processQuestions(questions: Question[]): Promise<Question[]> {
    this.checkApiKey();
    
    const processedQuestions: Question[] = [];
    
    for (const question of questions) {
      try {
        const result = await this.generateAnswer(question.text);
        processedQuestions.push({
          ...question,
          answer: result.answer,
          sources: result.sources,
          status: "completed",
        });
      } catch (error) {
        processedQuestions.push({
          ...question,
          status: "failed",
          answer: "Error generating answer",
          sources: [],
        });
      }
    }
    
    return processedQuestions;
  }

  async generateChatResponse(message: string, context: string = ""): Promise<{ answer: string; sources: string[] }> {
    return this.generateAnswer(message, context);
  }
}
