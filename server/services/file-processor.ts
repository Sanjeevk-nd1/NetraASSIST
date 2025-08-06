import { Question } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

export class FileProcessor {
  async processFile(filePath: string, fileType: "excel" | "pdf"): Promise<Question[]> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
      }

      if (fileType === "excel") {
        return await this.extractQuestionsFromExcel(filePath);
      } else {
        return await this.extractQuestionsFromPDF(filePath);
      }
    } catch (error) {
      console.error(`File processing error for ${filePath}:`, error);
      throw new Error(
        `Failed to process ${fileType} file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async extractQuestionsFromExcel(filePath: string): Promise<Question[]> {
    try {
      console.log(`Processing Excel file: ${path.basename(filePath)}`);

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      const headerRow = data[0];
      const questionColumnIndex = headerRow.findIndex(
        (col: string) => col?.toString().toLowerCase().trim() === "question"
      );

      if (questionColumnIndex === -1) {
        throw new Error("The uploaded Excel file must contain a column named 'Question'.");
      }

      const questions: Question[] = data
        .slice(1)
        .map((row: any[]): Question | null => {
          const questionText = row[questionColumnIndex]?.toString().trim();
          if (!questionText) return null;
          return {
            id: uuidv4(),
            text: questionText,
            status: "pending",
            accepted: false,
            answer: undefined,
            sources: undefined,
          };
        })
        .filter((q): q is Question => q !== null);

      if (questions.length === 0) {
        throw new Error("No valid questions found in Excel file.");
      }

      console.log(`Extracted ${questions.length} questions from Excel file`);
      return questions;
    } catch (error) {
      console.error(`Error extracting questions from Excel: ${filePath}`, error);
      throw error;
    }
  }

  private async extractQuestionsFromPDF(filePath: string): Promise<Question[]> {
    console.log(`Processing PDF file: ${path.basename(filePath)} (PDF parsing not implemented)`);
    throw new Error("PDF processing not implemented");
  }
}
