import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
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
  type Question,
} from "@shared/schema";
import { eq } from "drizzle-orm";

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
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUserChatMessages(userId: number): Promise<ChatMessage[]>;
  deleteChatMessage(id: number): Promise<boolean>;
  clearUserChatHistory(userId: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("Error: DATABASE_URL is not set in .env");
      throw new Error("DATABASE_URL is required");
    }
    console.log("Storage connecting to:", connectionString);

    const client = new Client({ connectionString });
    client.on("error", (err: Error) => console.error("PostgreSQL client error:", err.message));

    this.db = drizzle(client, { schema: { users, documents, processingJobs, chatMessages } });
    client.connect().catch(err => {
      console.error("Failed to connect to PostgreSQL in storage.ts:", err.message);
      throw err;
    });
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

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await this.db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getUserChatMessages(userId: number): Promise<ChatMessage[]> {
    return this.db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    const result = await this.db.delete(chatMessages).where(eq(chatMessages.id, id)).returning();
    return result.length > 0;
  }

  async clearUserChatHistory(userId: number): Promise<boolean> {
    const result = await this.db.delete(chatMessages).where(eq(chatMessages.userId, userId)).returning();
    return result.length > 0;
  }
}

export const storage = new PostgresStorage();
