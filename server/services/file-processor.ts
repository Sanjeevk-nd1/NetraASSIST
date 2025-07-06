import { Question } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export class FileProcessor {
  async processFile(filePath: string, fileType: "excel" | "pdf"): Promise<Question[]> {
    if (fileType === "excel") {
      return this.extractQuestionsFromExcel(filePath);
    } else {
      return this.extractQuestionsFromPDF(filePath);
    }
  }

  private async extractQuestionsFromExcel(filePath: string): Promise<Question[]> {
    // Using a Python script to process Excel files
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, "extract_excel_questions.py");
      const process = spawn("python3", [pythonScript, filePath]);
      
      let output = "";
      let error = "";
      
      process.stdout.on("data", (data) => {
        output += data.toString();
      });
      
      process.stderr.on("data", (data) => {
        error += data.toString();
      });
      
      process.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${error}`));
          return;
        }
        
        try {
          const questions = JSON.parse(output);
          const formattedQuestions: Question[] = questions.map((q: string) => ({
            id: uuidv4(),
            text: q,
            status: "pending" as const,
            accepted: false,
          }));
          resolve(formattedQuestions);
        } catch (parseError) {
          reject(new Error("Failed to parse Excel questions"));
        }
      });
    });
  }

  private async extractQuestionsFromPDF(filePath: string): Promise<Question[]> {
    // Using a Python script to process PDF files
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, "extract_pdf_questions.py");
      const process = spawn("python3", [pythonScript, filePath]);
      
      let output = "";
      let error = "";
      
      process.stdout.on("data", (data) => {
        output += data.toString();
      });
      
      process.stderr.on("data", (data) => {
        error += data.toString();
      });
      
      process.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${error}`));
          return;
        }
        
        try {
          const questions = JSON.parse(output);
          const formattedQuestions: Question[] = questions.map((q: string) => ({
            id: uuidv4(),
            text: q,
            status: "pending" as const,
            accepted: false,
          }));
          resolve(formattedQuestions);
        } catch (parseError) {
          reject(new Error("Failed to parse PDF questions"));
        }
      });
    });
  }
}
