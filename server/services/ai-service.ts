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
    
    // Use the updated prompt for better responses
    const prompt = `
You are an expert in compliance and policy enforcement in Netradyne. Answer the question strictly based on the knowledge in the provided documents. 
Your response should be clear, authoritative, and focused solely on providing the most relevant and accurate answer.
Avoid mentioning the documents, sections, or any sources. Do not include the question or any prefixes in your response. Just provide the answer.
If the context does not contain relevant information, respond with: "I'm sorry, I don't have enough information to answer this question"
If the answer to the question is a direct "YES" or "NO," provide a concise explanation of the reason for that answer, based on the context.
For all other cases, provide a detailed and accurate response based on the context.
Please ensure your response is comprehensive, user-friendly, and professionally formatted for business use.

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
    
    // Load training documents context
    const context = await this.loadTrainingContext();
    
    const processedQuestions: Question[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      try {
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
        
        const result = await this.generateAnswer(question.text, context);
        processedQuestions.push({
          ...question,
          answer: result.answer,
          sources: result.sources,
          status: "completed",
        });
      } catch (error) {
        console.error(`Error processing question ${i + 1}:`, error);
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
