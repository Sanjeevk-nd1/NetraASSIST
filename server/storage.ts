import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users,
  documents,
  processingJobs,
  conversations,
  chatMessages,
  generatedFiles,
  type User,
  type InsertUser,
  type Document,
  type InsertDocument,
  type ProcessingJob,
  type InsertProcessingJob,
  type Conversation,
  type InsertConversation,
  type ChatMessage,
  type InsertChatMessage,
  type GeneratedFile,
  type InsertGeneratedFile,
  type Question,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

import dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  updateUserRole(userId: number, role: "user" | "admin"): Promise<User | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: number): Promise<boolean>;
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: number): Promise<ProcessingJob | undefined>;
  getUserProcessingJobs(userId: number): Promise<ProcessingJob[]>;
  updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined>;
  deleteProcessingJob(id: number): Promise<boolean>;
  updateQuestions(jobId: number, questions: Question[]): Promise<boolean>;
  updateQuestionAnswer(jobId: number, questionId: string, answer: string): Promise<boolean>;
  acceptQuestion(jobId: number, questionId: string): Promise<boolean>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUserChatMessages(userId: number, conversationId?: number): Promise<ChatMessage[]>;
  deleteChatMessage(id: number): Promise<boolean>;
  clearUserChatHistory(userId: number, conversationId?: number): Promise<boolean>;
  createGeneratedFile(file: InsertGeneratedFile): Promise<GeneratedFile>;
  getUserGeneratedFiles(userId: number): Promise<GeneratedFile[]>;
  getGeneratedFile(id: number): Promise<GeneratedFile | undefined>;
  deleteGeneratedFile(id: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private client: pg.Client;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("Error: DATABASE_URL is not set in .env");
      throw new Error("DATABASE_URL is required");
    }
    console.log("Storage connecting to:", connectionString);

    this.client = new Client({ connectionString });
    this.client.on("error", (err: Error) => console.error("PostgreSQL client error:", err.message));

    this.db = drizzle(this.client, { schema: { users, documents, processingJobs, conversations, chatMessages, generatedFiles } });
    this.client.connect().catch(err => {
      console.error("Failed to connect to PostgreSQL in storage.ts:", err.message);
      throw err;
    });
  }

  async destroy() {
    await this.client.end();
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async updateUserRole(userId: number, role: "user" | "admin"): Promise<User | undefined> {
    const [updatedUser] = await this.db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await this.db.insert(documents).values(document).returning();
    return newDocument;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const result = await this.db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return result[0];
  }

  async getAllDocuments(): Promise<Document[]> {
    return this.db.select().from(documents);
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await this.db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  async createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob> {
    const [newJob] = await this.db.insert(processingJobs).values(job).returning();
    return newJob;
  }

  async getProcessingJob(id: number): Promise<ProcessingJob | undefined> {
    const result = await this.db.select().from(processingJobs).where(eq(processingJobs.id, id)).limit(1);
    return result[0];
  }

  async getUserProcessingJobs(userId: number): Promise<ProcessingJob[]> {
    return this.db.select().from(processingJobs).where(eq(processingJobs.userId, userId));
  }

  async updateProcessingJob(id: number, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const [updatedJob] = await this.db
      .update(processingJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(processingJobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteProcessingJob(id: number): Promise<boolean> {
    const result = await this.db.delete(processingJobs).where(eq(processingJobs.id, id)).returning();
    return result.length > 0;
  }

  async updateQuestions(jobId: number, questions: Question[]): Promise<boolean> {
    const result = await this.db
      .update(processingJobs)
      .set({ questions, updatedAt: new Date() })
      .where(eq(processingJobs.id, jobId))
      .returning();
    return result.length > 0;
  }

  async updateQuestionAnswer(jobId: number, questionId: string, answer: string): Promise<boolean> {
    const job = await this.getProcessingJob(jobId);
    if (!job || !job.questions) return false;

    const updatedQuestions = job.questions.map(q =>
      q.id === questionId ? { ...q, answer, status: "completed" as const } : q
    );

    const result = await this.db
      .update(processingJobs)
      .set({ questions: updatedQuestions, updatedAt: new Date() })
      .where(eq(processingJobs.id, jobId))
      .returning();
    return result.length > 0;
  }

  async acceptQuestion(jobId: number, questionId: string): Promise<boolean> {
    const job = await this.getProcessingJob(jobId);
    if (!job || !job.questions) return false;

    const updatedQuestions = job.questions.map(q =>
      q.id === questionId ? { ...q, accepted: true } : q
    );

    const result = await this.db
      .update(processingJobs)
      .set({ questions: updatedQuestions, updatedAt: new Date() })
      .where(eq(processingJobs.id, jobId))
      .returning();
    return result.length > 0;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await this.db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return this.db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const result = await this.db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [updatedConversation] = await this.db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  async deleteConversation(id: number): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Clean up physical files for generated_files
      const files = await tx.select().from(generatedFiles).where(eq(generatedFiles.conversationId, id));
      for (const file of files) {
        try {
          if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
            console.log(`Deleted file: ${file.filePath}`);
          }
        } catch (err) {
          console.error(`Failed to delete file ${file.filePath}:`, err);
        }
      }
      // Delete conversation (database will cascade to chat_messages and generated_files)
      const result = await tx.delete(conversations).where(eq(conversations.id, id)).returning();
      return result.length > 0;
    });
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await this.db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getUserChatMessages(userId: number, conversationId?: number): Promise<ChatMessage[]> {
    if (conversationId) {
      return this.db
        .select()
        .from(chatMessages)
        .where(and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.conversationId, conversationId)
        ))
        .orderBy(chatMessages.createdAt);
    }
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.createdAt);
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    const result = await this.db.delete(chatMessages).where(eq(chatMessages.id, id)).returning();
    return result.length > 0;
  }

  async clearUserChatHistory(userId: number, conversationId?: number): Promise<boolean> {
    if (conversationId) {
      const result = await this.db
        .delete(chatMessages)
        .where(and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.conversationId, conversationId)
        ))
        .returning();
      return result.length > 0;
    }
    const result = await this.db.delete(chatMessages).where(eq(chatMessages.userId, userId)).returning();
    return result.length > 0;
  }

  async createGeneratedFile(file: InsertGeneratedFile): Promise<GeneratedFile> {
    const [newFile] = await this.db.insert(generatedFiles).values(file).returning();
    return newFile;
  }

  async getUserGeneratedFiles(userId: number): Promise<GeneratedFile[]> {
    return this.db.select().from(generatedFiles).where(eq(generatedFiles.userId, userId)).orderBy(generatedFiles.createdAt);
  }

  async getGeneratedFile(id: number): Promise<GeneratedFile | undefined> {
    const result = await this.db.select().from(generatedFiles).where(eq(generatedFiles.id, id)).limit(1);
    return result[0];
  }

  async deleteGeneratedFile(id: number): Promise<boolean> {
    const result = await this.db.delete(generatedFiles).where(eq(generatedFiles.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new PostgresStorage();