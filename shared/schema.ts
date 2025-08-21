import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const processingJobs = pgTable("processing_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  status: text("status").notNull().default("pending"),
  questions: jsonb("questions").$type<Question[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
  sources: jsonb("sources").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedFiles = pgTable("generated_files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  jobId: integer("job_id").references(() => processingJobs.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  fileName: true,
  filePath: true,
  fileSize: true,
  uploadedBy: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).pick({
  userId: true,
  fileName: true,
  fileType: true,
  status: true,
  questions: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  conversationId: true,
  message: true,
  response: true,
  sources: true,
});

export const insertGeneratedFileSchema = createInsertSchema(generatedFiles).pick({
  userId: true,
  jobId: true,
  conversationId: true,
  fileName: true,
  filePath: true,
  fileSize: true,
});

export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  answer: z.string().optional(),
  accepted: z.boolean().default(false),
  status: z.enum(["pending", "processing", "completed", "failed"]).default("pending"),
  sources: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "admin"]).default("user"),
});

export const fileUploadSchema = z.object({
  file: z.any(),
  type: z.enum(["excel", "pdf"]),
});

export const chatQuerySchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.number().optional(),
});

export const processQuestionsSchema = z.object({
  jobId: z.number(),
  questions: z.array(questionSchema),
});

export const acceptAnswerSchema = z.object({
  questionId: z.string(),
});

export const regenerateAnswerSchema = z.object({
  questionId: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type GeneratedFile = typeof generatedFiles.$inferSelect;
export type InsertGeneratedFile = z.infer<typeof insertGeneratedFileSchema>;
export type Question = z.infer<typeof questionSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type ChatQuery = z.infer<typeof chatQuerySchema>;
export type ProcessQuestions = z.infer<typeof processQuestionsSchema>;
export type AcceptAnswer = z.infer<typeof acceptAnswerSchema>;
export type RegenerateAnswer = z.infer<typeof regenerateAnswerSchema>;