import { 
  users, 
  documents,
  processingJobs, 
  chatMessages,
  type User, 
  type InsertUser, 
  type Document,
  type InsertDocument,
  type ProcessingJob, 
  type InsertProcessingJob,
  type ChatMessage,
  type InsertChatMessage,
  type Question
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
  // Document management
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Processing jobs
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: number): Promise<ProcessingJob | undefined>;
  getUserProcessingJobs(userId: number): Promise<ProcessingJob[]>;
  updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined>;
  deleteProcessingJob(id: number): Promise<boolean>;
  
  // Questions
  updateQuestions(jobId: number, questions: Question[]): Promise<boolean>;
  updateQuestionAnswer(jobId: number, questionId: string, answer: string): Promise<boolean>;
  acceptQuestion(jobId: number, questionId: string): Promise<boolean>;
  
  // Chat messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUserChatMessages(userId: number): Promise<ChatMessage[]>;
  deleteChatMessage(id: number): Promise<boolean>;
  clearUserChatHistory(userId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private processingJobs: Map<number, ProcessingJob>;
  private chatMessages: Map<number, ChatMessage>;
  currentUserId: number;
  currentDocumentId: number;
  currentJobId: number;
  currentChatId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.processingJobs = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentJobId = 1;
    this.currentChatId = 1;
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || "user",
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Document management
  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const doc: Document = { 
      ...document, 
      id, 
      uploadedBy: document.uploadedBy || null,
      createdAt: now 
    };
    this.documents.set(id, doc);
    return doc;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Processing jobs
  async createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob> {
    const id = this.currentJobId++;
    const now = new Date();
    const processingJob: ProcessingJob = { 
      ...job, 
      id, 
      status: job.status || "pending",
      questions: job.questions || null,
      createdAt: now,
      updatedAt: now
    };
    this.processingJobs.set(id, processingJob);
    return processingJob;
  }

  async getProcessingJob(id: number): Promise<ProcessingJob | undefined> {
    return this.processingJobs.get(id);
  }

  async getUserProcessingJobs(userId: number): Promise<ProcessingJob[]> {
    return Array.from(this.processingJobs.values()).filter(
      (job) => job.userId === userId
    );
  }

  async updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const job = this.processingJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.processingJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteProcessingJob(id: number): Promise<boolean> {
    return this.processingJobs.delete(id);
  }

  // Questions
  async updateQuestions(jobId: number, questions: Question[]): Promise<boolean> {
    const job = this.processingJobs.get(jobId);
    if (!job) return false;
    
    const updatedJob = { ...job, questions, updatedAt: new Date() };
    this.processingJobs.set(jobId, updatedJob);
    return true;
  }

  async updateQuestionAnswer(jobId: number, questionId: string, answer: string): Promise<boolean> {
    const job = this.processingJobs.get(jobId);
    if (!job || !job.questions) return false;
    
    const updatedQuestions = job.questions.map(q => 
      q.id === questionId ? { ...q, answer, status: "completed" as const } : q
    );
    
    const updatedJob = { ...job, questions: updatedQuestions, updatedAt: new Date() };
    this.processingJobs.set(jobId, updatedJob);
    return true;
  }

  async acceptQuestion(jobId: number, questionId: string): Promise<boolean> {
    const job = this.processingJobs.get(jobId);
    if (!job || !job.questions) return false;
    
    const updatedQuestions = job.questions.map(q => 
      q.id === questionId ? { ...q, accepted: true } : q
    );
    
    const updatedJob = { ...job, questions: updatedQuestions, updatedAt: new Date() };
    this.processingJobs.set(jobId, updatedJob);
    return true;
  }

  // Chat messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatId++;
    const now = new Date();
    const chatMessage: ChatMessage = { 
      ...message, 
      id, 
      sources: message.sources || null,
      createdAt: now 
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }

  async getUserChatMessages(userId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(
      (msg) => msg.userId === userId
    );
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    return this.chatMessages.delete(id);
  }

  async clearUserChatHistory(userId: number): Promise<boolean> {
    const userMessages = Array.from(this.chatMessages.entries()).filter(
      ([_, msg]) => msg.userId === userId
    );
    
    userMessages.forEach(([id, _]) => {
      this.chatMessages.delete(id);
    });
    
    return true;
  }
}

export const storage = new MemStorage();
