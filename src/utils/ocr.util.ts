import fs from "fs";
import path from "path";
import { createWorker } from "tesseract.js";
import { PDFDocument } from "pdf-lib";
import { fromPath as convertFromPath } from "pdf2pic";
import { deleteTempFiles } from "../middleware/upload.middleware";

export class OCRService {
  async extractTextFromImage(imagePath: string): Promise<string> {
    try {
      const worker = await createWorker("eng+ben");
      const {
        data: { text },
      } = await worker.recognize(imagePath);
      await worker.terminate();
      return text;
    } catch (error) {
      console.error("Error extracting text from image:", error);
      throw new Error(`OCR processing failed: ${(error as Error).message}`);
    }
  }

  async extractTextFromPDF(
    pdfPath: string,
    tempImagePaths: string[]
  ): Promise<string[]> {
    try {
      const extractedTextArray: string[] = [];
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();

      const baseOptions = {
        density: 300,
        saveFilename: `pdf-page-${Date.now()}`,
        savePath: path.dirname(pdfPath),
        format: "png",
        width: 1000,
        height: 1400,
      };

      const convert = convertFromPath(pdfPath, baseOptions);

      for (let i = 1; i <= totalPages; i++) {
        const pageOutput = await convert(i);
        const imagePath = pageOutput.path;
        if (!imagePath) {
          throw new Error("Failed to generate image from PDF page");
        }
        tempImagePaths.push(imagePath); // Track image for deletion
        const pageText = await this.extractTextFromImage(imagePath);
        extractedTextArray.push(pageText);
      }

      return extractedTextArray;
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw new Error(`PDF processing failed: ${(error as Error).message}`);
    }
  }

  async processFile(
    filePath: string,
    tempImagePaths: string[] = []
  ): Promise<string[]> {
    try {
      const extension = path.extname(filePath).toLowerCase();

      if (extension === ".pdf") {
        return await this.extractTextFromPDF(filePath, tempImagePaths);
      } else {
        const text = await this.extractTextFromImage(filePath);
        return [text];
      }
    } catch (error) {
      console.error("Error processing file:", error);
      throw new Error(`File processing failed: ${(error as Error).message}`);
    }
  }

  chunkText(text: string, chunkSize: number = 1500): string[] {
    const chunks: string[] = [];
    if (text.length <= chunkSize) {
      return [text];
    }

    const paragraphs = text.split(/\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if (
        currentChunk.length + paragraph.length > chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += "\n\n";
        }
        currentChunk += paragraph;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}

export const ocrService = new OCRService();
