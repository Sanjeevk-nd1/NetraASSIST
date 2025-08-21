import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AIService } from "./services/ai-service";
import { FileProcessor } from "./services/file-processor";
import multer from "multer";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { attachUser } from './middleware/auth';
import { 
  fileUploadSchema, 
  acceptAnswerSchema, 
  regenerateAnswerSchema,
  loginSchema,
  signupSchema,
  chatQuerySchema
} from "@shared/schema";
import { jwtMiddleware, setTokenCookie, clearTokenCookie } from "./middleware/jwt";

const upload = multer({ dest: "uploads/" });
const aiService = new AIService();
const fileProcessor = new FileProcessor();

const app = express();
app.use(express.json());

// Middleware to check admin role
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = signupSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) return res.status(400).json({ error: "Username already exists" });

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) return res.status(400).json({ error: "Email already exists" });

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      setTokenCookie(res, { userId: user.id });

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

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) return res.status(401).json({ error: "Invalid credentials" });

      setTokenCookie(res, { userId: user.id });

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

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    clearTokenCookie(res);
    res.json({ success: true });
  });

  // Get current user
  app.get("/api/auth/me", jwtMiddleware, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", jwtMiddleware, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { type } = req.body;
      if (!type || !["excel", "pdf"].includes(type)) {
        return res.status(400).json({ error: "Invalid file type specified" });
      }

      const job = await storage.createProcessingJob({
        userId: req.user!.id,
        fileName: req.file.originalname,
        fileType: type,
        status: "pending",
        questions: null,
      });

      const questions = await fileProcessor.processFile(req.file.path, type as "excel" | "pdf");
      
      await storage.updateQuestions(job.id, questions);
      await storage.updateProcessingJob(job.id, { status: "processing" });

      fs.unlinkSync(req.file.path);

      res.json({ jobId: job.id, questionsCount: questions.length });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Get job status
  app.get("/api/jobs/:jobId", jwtMiddleware, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getProcessingJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

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
  app.get("/api/jobs", jwtMiddleware, async (req, res) => {
    try {
      const jobs = await storage.getUserProcessingJobs(req.user!.id);
      res.json(jobs);
    } catch (error) {
      console.error("Get jobs error:", error);
      res.status(500).json({ error: "Failed to get jobs" });
    }
  });

  // Generate answers for all questions
  app.post("/api/jobs/:jobId/generate", jwtMiddleware, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getProcessingJob(jobId);
      
      if (!job || !job.questions) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const processedQuestions = await aiService.processQuestions(job.questions);
      
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
  app.post("/api/jobs/:jobId/accept", jwtMiddleware, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { questionId } = acceptAnswerSchema.parse(req.body);
      
      const job = await storage.getProcessingJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

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
  app.post("/api/jobs/:jobId/regenerate", jwtMiddleware, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { questionId } = regenerateAnswerSchema.parse(req.body);
      
      const job = await storage.getProcessingJob(jobId);
      if (!job || !job.questions) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const question = job.questions.find(q => q.id === questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const result = await aiService.generateAnswer(question.text, job.questions);
      
      await storage.updateQuestionAnswer(jobId, questionId, result.answer);

      res.json({ success: true, answer: result.answer, sources: result.sources });
    } catch (error) {
      console.error("Regenerate answer error:", error);
      res.status(500).json({ error: "Failed to regenerate answer" });
    }
  });

  // Export job questions/answers
  app.get("/api/jobs/:jobId/export", jwtMiddleware, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getProcessingJob(jobId);
      
      if (!job || !job.questions) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const allAccepted = job.questions.every(q => q.accepted);
      if (!allAccepted) {
        return res.status(400).json({ error: "All answers must be accepted before exporting" });
      }

      const excelData = job.questions.map((q, index) => ({
        "Question Number": index + 1,
        Question: q.text,
        Answer: q.answer || "",
        Sources: q.sources?.join("; ") || "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      const colWidths = [
        { wch: 15 },
        { wch: 40 },
        { wch: 80 },
        { wch: 30 },
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, "Responses");

      const generatedFilesDir = "generated_files";
      if (!fs.existsSync(generatedFilesDir)) {
        fs.mkdirSync(generatedFilesDir, { recursive: true });
      }

      const fileName = `job_${jobId}_${Date.now()}.xlsx`;
      const filePath = path.join(generatedFilesDir, fileName);

      try {
        XLSX.writeFile(wb, filePath, { bookType: 'xlsx' });
      } catch (writeError) {
        console.error("XLSX write error:", writeError);
        throw new Error("Failed to write Excel file");
      }

      const stats = fs.statSync(filePath);
      await storage.createGeneratedFile({
        userId: req.user!.id,
        jobId,
        conversationId: null,
        fileName,
        filePath,
        fileSize: stats.size,
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      
      res.sendFile(filePath, { root: process.cwd() }, (err) => {
        if (err) {
          console.error("Send file error:", err);
          res.status(500).json({ error: "Failed to send file" });
        }
      });
    } catch (error) {
      console.error("Export job error:", error);
      res.status(500).json({ error: "Failed to export job" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", jwtMiddleware, async (req, res) => {
    try {
      const currentDateTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const conversation = await storage.createConversation({
        userId: req.user!.id,
        title: currentDateTime,
      });
      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Get user's conversations
  app.get("/api/conversations", jwtMiddleware, async (req, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Delete conversation
    app.delete("/api/conversations/:conversationId", jwtMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });

      if (conversation.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const success = await storage.deleteConversation(conversationId);
      if (!success) return res.status(404).json({ error: "Conversation not found" });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", jwtMiddleware, async (req, res) => {
    try {
      const { message, conversationId } = chatQuerySchema.parse(req.body);
      
      let convId = conversationId;
      if (!convId) {
        const currentDateTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const newConversation = await storage.createConversation({
          userId: req.user!.id,
          title: currentDateTime,
        });
        convId = newConversation.id;
      }

      const conversation = await storage.getConversation(convId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const history = await storage.getUserChatMessages(req.user!.id, convId);
      const result = await aiService.generateChatResponse(message, history);
      
      const chatMessage = await storage.createChatMessage({
        userId: req.user!.id,
        conversationId: convId,
        message,
        response: result.answer,
        sources: result.sources,
      });

      await storage.updateConversation(convId, { updatedAt: new Date() });

      res.json({
        id: chatMessage.id,
        conversationId: chatMessage.conversationId,
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

  // Get conversation messages
  app.get("/api/chat/history/:conversationId", jwtMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await storage.getUserChatMessages(req.user!.id, conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Chat history error:", error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  // Clear conversation history
  app.delete("/api/chat/history/:conversationId", jwtMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.clearUserChatHistory(req.user!.id, conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear chat history error:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // Export chat history
  app.get("/api/chat/export/:conversationId", jwtMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const chatHistory = await storage.getUserChatMessages(req.user!.id, conversationId);
      
      if (!chatHistory || chatHistory.length === 0) {
        return res.status(404).json({ error: "No chat history found" });
      }

      const excelData = chatHistory.map(chat => ({
        Question: chat.message,
        Response: chat.response || "",
        Sources: chat.sources?.join("; ") || "",
        Date: chat.createdAt ? new Date(chat.createdAt).toLocaleString() : "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      const colWidths = [
        { wch: 40 },
        { wch: 80 },
        { wch: 30 },
        { wch: 20 },
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, "Chat History");

      const generatedFilesDir = "generated_files";
      if (!fs.existsSync(generatedFilesDir)) {
        fs.mkdirSync(generatedFilesDir, { recursive: true });
      }

      const fileName = `chat_${conversationId}_${Date.now()}.xlsx`;
      const filePath = path.join(generatedFilesDir, fileName);

      try {
        XLSX.writeFile(wb, filePath, { bookType: 'xlsx' });
      } catch (writeError) {
        console.error("XLSX write error:", writeError);
        throw new Error("Failed to write Excel file");
      }

      const stats = fs.statSync(filePath);
      await storage.createGeneratedFile({
        userId: req.user!.id,
        jobId: null,
        conversationId,
        fileName,
        filePath,
        fileSize: stats.size,
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      
      res.sendFile(filePath, { root: process.cwd() }, (err) => {
        if (err) {
          console.error("Send file error:", err);
          res.status(500).json({ error: "Failed to send file" });
        }
      });
    } catch (error) {
      console.error("Export chat history error:", error);
      res.status(500).json({ error: "Failed to export chat history" });
    }
  });

  // Get user's generated files
  app.get("/api/files", jwtMiddleware, async (req, res) => {
    try {
      const files = await storage.getUserGeneratedFiles(req.user!.id);
      res.json(files);
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ error: "Failed to get files" });
    }
  });

  // Download generated file
  app.get("/api/files/:fileId", jwtMiddleware, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const file = await storage.getGeneratedFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (file.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ error: "File not found on server" });
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
      
      res.sendFile(file.filePath, { root: process.cwd() }, (err) => {
        if (err) {
          console.error("Send file error:", err);
          res.status(500).json({ error: "Failed to send file" });
        }
      });
    } catch (error) {
      console.error("Get file error:", error);
      res.status(500).json({ error: "Failed to get file" });
    }
  });

  // Delete generated file
  app.delete("/api/files/:fileId", jwtMiddleware, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const file = await storage.getGeneratedFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (file.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }

      const success = await storage.deleteGeneratedFile(fileId);
      if (!success) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Admin routes: Users
  app.get("/api/admin/users", jwtMiddleware, attachUser, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.delete("/api/admin/users/:userId", jwtMiddleware, attachUser, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (userId === req.user!.id) return res.status(400).json({ error: "Cannot delete your own account" });

      const success = await storage.deleteUser(userId);
      if (!success) return res.status(404).json({ error: "User not found" });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/admin/users/:userId/role", jwtMiddleware, attachUser, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
      if (userId === req.user!.id && role !== "admin") return res.status(400).json({ error: "Cannot remove your own admin access" });

      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) return res.status(404).json({ error: "User not found" });

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

  app.get("/api/admin/documents", jwtMiddleware, attachUser, requireAdmin, async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.post("/api/admin/documents", jwtMiddleware, attachUser, requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const documentsDir = "docs";
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      const fileName = `${Date.now()}_${req.file.originalname}`;
      const filePath = path.join(documentsDir, fileName);
      fs.renameSync(req.file.path, filePath);

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

  app.delete("/api/admin/documents/:documentId", jwtMiddleware, attachUser, requireAdmin, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

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