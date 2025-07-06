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
    
    // If no context is provided, use general business knowledge
    const prompt = context.trim() ? `
You are an expert business consultant specializing in RFP responses. Answer the question based on the provided context.
Your response should be professional, detailed, and directly address the question asked.
Provide specific, actionable information that would be valuable in a business proposal.

Context: ${context}

Question: ${question}
` : `
You are an expert business consultant specializing in RFP responses. Provide a professional, comprehensive answer to this RFP question.
Your response should be detailed, practical, and demonstrate business expertise. Include relevant considerations, best practices, and actionable information.

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
    
    // Load training documents context
    const context = await this.loadTrainingContext();
    
    const processedQuestions: Question[] = [];
    
    for (const question of questions) {
      try {
        const result = await this.generateAnswer(question.text, context);
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

  private async loadTrainingContext(): Promise<string> {
    try {
      // In production, this would load from uploaded training documents
      // For now, return general business context
      return `
Company Information:
- We are a technology consulting company specializing in digital transformation
- Our team consists of 50+ certified professionals
- Annual revenue: $5M+ with 98% client satisfaction rate
- Certifications: ISO 27001, SOC 2 Type II, PCI DSS
- Established: 2015, serving Fortune 500 clients globally

Security & Compliance:
- 24/7 SOC monitoring and incident response
- End-to-end encryption for all data transmission
- Regular penetration testing and vulnerability assessments
- GDPR, HIPAA, and SOX compliance frameworks
- Zero-trust security architecture

Technical Capabilities:
- Cloud-native solutions (AWS, Azure, GCP)
- DevOps and CI/CD pipeline implementation
- AI/ML model development and deployment
- Full-stack development (React, Node.js, Python)
- Enterprise integration and API development
      `.trim();
    } catch (error) {
      console.error("Error loading training context:", error);
      return "";
    }
  }

  async generateChatResponse(message: string, context: string = ""): Promise<{ answer: string; sources: string[] }> {
    return this.generateAnswer(message, context);
  }
}
