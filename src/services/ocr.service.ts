import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { PDFDocument } from 'pdf-lib';
import { from as convertFromPath } from 'pdf2pic';
import { deleteTempFiles } from '../middleware/upload.middleware';

// Service to handle text extraction from images and PDFs
export class OCRService {
  /**
   * Extract text from an image file using Tesseract OCR
   */
  async extractTextFromImage(imagePath: string): Promise<string> {
    try {
      // Create worker with multiple language support (English + Bengali)
      const worker = await createWorker('eng+ben');
      
      // Recognize text
      const { data: { text } } = await worker.recognize(imagePath);
      
      // Terminate worker
      await worker.terminate();
      
      return text;
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw new Error(`OCR processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Convert PDF to images and then extract text
   */
  async extractTextFromPDF(pdfPath: string): Promise<string[]> {
    try {
      const extractedTextArray: string[] = [];
      const tempImagesPath: string[] = [];
      
      // Read the PDF file
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      // Setup PDF to image conversion
      const baseOptions = {
        density: 300,
        saveFilename: `pdf-page`,
        savePath: path.dirname(pdfPath),
        format: "png",
        width: 1000,
        height: 1400
      };
      
      const convert = convertFromPath(pdfPath, baseOptions);
      
      // Convert each page and extract text
      for (let i = 1; i <= totalPages; i++) {
        // Convert page to image
        const pageOutput = await convert(i);
        const imagePath = pageOutput.path;
        tempImagesPath.push(imagePath);
        
        // Extract text from the image
        const pageText = await this.extractTextFromImage(imagePath);
        extractedTextArray.push(pageText);
      }
      
      // Clean up temporary image files
      deleteTempFiles(tempImagesPath);
      
      return extractedTextArray;
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`PDF processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process a file (image or PDF) and extract text
   */
  async processFile(filePath: string): Promise<string[]> {
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      if (extension === '.pdf') {
        // Process PDF file
        return await this.extractTextFromPDF(filePath);
      } else {
        // Process image file
        const text = await this.extractTextFromImage(filePath);
        return [text];
      }
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error(`File processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Split text into chunks for AI processing
   */
  chunkText(text: string, chunkSize: number = 1500): string[] {
    const chunks: string[] = [];
    
    // If text is shorter than chunk size, return as single chunk
    if (text.length <= chunkSize) {
      return [text];
    }
    
    // Split by paragraphs/newlines first
    const paragraphs = text.split(/\n+/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        // Save current chunk and start a new one
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n';
        }
        currentChunk += paragraph;
      }
    }
    
    // Add the last chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
}

export const ocrService = new OCRService();