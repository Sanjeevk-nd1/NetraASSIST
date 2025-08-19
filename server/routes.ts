import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AIService } from "./services/ai-service";
import { FileProcessor } from "./services/file-processor";
import { authenticateUser, requireAdmin } from "./middleware/auth";
import multer from "multer";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { 
  fileUploadSchema, 
  acceptAnswerSchema, 
  regenerateAnswerSchema,
  loginSchema,
  signupSchema,
  chatQuerySchema
} from "@shared/schema";

const upload = multer({ dest: "uploads/" });
const aiService = new AIService();
const fileProcessor = new FileProcessor();

const app = express();


app.use(express.json());

export async function registerRoutes(app: Express): Promise<Server> {

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Set session
      req.session.userId = user.id;
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", authenticateUser, (req, res) => {
    res.json({ user: req.user });
  });

  // File upload endpoint
  app.post("/api/upload", authenticateUser, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { type } = req.body;
      
      if (!type || !["excel", "pdf"].includes(type)) {
        return res.status(400).json({ error: "Invalid file type specified" });
      }

      // Create processing job
      const job = await storage.createProcessingJob({
        userId: req.user!.id,
        fileName: req.file.originalname,
        fileType: type,
        status: "pending",
        questions: null,
      });

      // Process file to extract questions
      const questions = await fileProcessor.processFile(req.file.path, type as "excel" | "pdf");
      
      // Update job with extracted questions
      await storage.updateQuestions(job.id, questions);
      await storage.updateProcessingJob(job.id, { status: "processing" });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ jobId: job.id, questionsCount: questions.length });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Get job status
  app.get("/api/jobs/:jobId", authenticateUser, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getProcessingJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if user owns this job
      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(job);
    } catch (error) {
      console.error("Get job error:", error);
      res.status(500).json({ error: "Failed to get job status" });
    }
  });

  // Get user's jobs
  app.get("/api/jobs", authenticateUser, async (req, res) => {
    try {
      const jobs = await storage.getUserProcessingJobs(req.user!.id);
      res.json(jobs);
    } catch (error) {
      console.error("Get jobs error:", error);
      res.status(500).json({ error: "Failed to get jobs" });
    }
  });

  // Generate answers for all questions
  app.post("/api/jobs/:jobId/generate", authenticateUser, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getProcessingJob(jobId);
      
      if (!job || !job.questions) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if user owns this job
      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Generate answers for all questions
      const processedQuestions = await aiService.processQuestions(job.questions);
      
      // Update job with processed questions
      await storage.updateQuestions(jobId, processedQuestions);
      await storage.updateProcessingJob(jobId, { status: "completed" });

      res.json({ success: true });
    } catch (error) {
      console.error("Generate answers error:", error);
      await storage.updateProcessingJob(parseInt(req.params.jobId), { status: "failed" });
      res.status(500).json({ error: "Failed to generate answers" });
    }
  });

  // Accept answer
  app.post("/api/jobs/:jobId/accept", authenticateUser, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { questionId } = acceptAnswerSchema.parse(req.body);
      
      const job = await storage.getProcessingJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if user owns this job
      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.acceptQuestion(jobId, questionId);
      
      if (!success) {
        return res.status(404).json({ error: "Question not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Accept answer error:", error);
      res.status(500).json({ error: "Failed to accept answer" });
    }
  });

  // Regenerate answer
  app.post("/api/jobs/:jobId/regenerate", authenticateUser, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { questionId } = regenerateAnswerSchema.parse(req.body);
      
      const job = await storage.getProcessingJob(jobId);
      if (!job || !job.questions) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if user owns this job
      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const question = job.questions.find(q => q.id === questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      // Generate new answer
      const result = await aiService.generateAnswer(question.text);
      
      // Update question with new answer
      await storage.updateQuestionAnswer(jobId, questionId, result.answer);

      res.json({ success: true, answer: result.answer, sources: result.sources });
    } catch (error) {
      console.error("Regenerate answer error:", error);
      res.status(500).json({ error: "Failed to regenerate answer" });
    }
  });

  // Chat endpoints
  app.post("/api/chat", authenticateUser, async (req, res) => {
    try {
      const { message } = chatQuerySchema.parse(req.body);
      
      // Generate response using AI service
      const result = await aiService.generateChatResponse(message);
      
      // Save chat message
      const chatMessage = await storage.createChatMessage({
        userId: req.user!.id,
        message,
        response: result.answer,
        sources: result.sources,
      });

      res.json({
        id: chatMessage.id,
        message: chatMessage.message,
        response: chatMessage.response,
        sources: chatMessage.sources,
        createdAt: chatMessage.createdAt,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get("/api/chat/history", authenticateUser, async (req, res) => {
    try {
      const messages = await storage.getUserChatMessages(req.user!.id);
      res.json(messages);
    } catch (error) {
      console.error("Chat history error:", error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  app.delete("/api/chat/history", authenticateUser, async (req, res) => {
    try {
      await storage.clearUserChatHistory(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear chat history error:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // Export results
  app.get("/api/jobs/:jobId/export", authenticateUser, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getProcessingJob(jobId);
      
      if (!job || !job.questions) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if user owns this job
      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if all questions are accepted
      const allAccepted = job.questions.every(q => q.accepted);
      if (!allAccepted) {
        return res.status(400).json({ error: "Not all questions are accepted" });
      }

      // Generate Excel file
      const excelData = job.questions.map(q => ({
        Question: q.text,
        Answer: q.answer || "",
        Sources: q.sources?.join("; ") || "",
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-adjust column widths
      const colWidths = [
        { wch: 50 }, // Question column
        { wch: 80 }, // Answer column
        { wch: 30 }, // Sources column
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "RFP Responses");
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="rfp_responses_${job.id}.xlsx"`);
      
      res.send(excelBuffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export results" });
    }
  });

  // Export chat history
  app.get("/api/chat/export", authenticateUser, async (req, res) => {
    try {
      const chatHistory = await storage.getUserChatMessages(req.user!.id);
      
      if (!chatHistory || chatHistory.length === 0) {
        return res.status(404).json({ error: "No chat history found" });
      }

      // Generate Excel file for chat history
      const excelData = chatHistory.map(chat => ({
        Question: chat.message,
        Response: chat.response,
        Sources: chat.sources?.join("; ") || "",
        Date: chat.createdAt ? new Date(chat.createdAt).toLocaleString() : "",
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-adjust column widths
      const colWidths = [
        { wch: 40 }, // Question column
        { wch: 80 }, // Response column
        { wch: 30 }, // Sources column
        { wch: 20 }, // Date column
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Chat History");
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="chat_history_${req.user!.id}.xlsx"`);
      
      res.send(excelBuffer);
    } catch (error) {
      console.error("Export chat history error:", error);
      res.status(500).json({ error: "Failed to export chat history" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't return passwords
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.delete("/api/admin/users/:userId", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Prevent admin from deleting themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

    app.patch("/api/admin/users/:userId/role", authenticateUser, requireAdmin, async (req, res) => {
  try {
    console.log("📩 Incoming role update request:", {
      userIdParam: req.params.userId,
      body: req.body,
      authenticatedUser: req.user,
    });

    const userId = parseInt(req.params.userId);
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (userId === req.user!.id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin access" });
    }

    const updatedUser = await storage.updateUserRole(userId, role);

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});


  app.get("/api/admin/documents", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.post("/api/admin/documents", authenticateUser, requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Move file to documents directory
      const documentsDir = "docs";
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      const fileName = `${Date.now()}_${req.file.originalname}`;
      const filePath = path.join(documentsDir, fileName);
      fs.renameSync(req.file.path, filePath);

      // Save document record
      const document = await storage.createDocument({
        fileName: req.file.originalname,
        filePath,
        fileSize: req.file.size,
        uploadedBy: req.user!.id,
      });

      res.json(document);
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.delete("/api/admin/documents/:documentId", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete file from filesystem
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

      // Delete from storage
      const success = await storage.deleteDocument(documentId);
      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}