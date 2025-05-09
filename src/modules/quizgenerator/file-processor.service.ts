import fs from "fs";
import path from "path";
import multer from "multer";
import { Request } from "express";
import { OCRService } from "../../services/ocr.service";

/**
 * FileProcessor class handles file uploads and processing
 */
export class FileProcessor {
  private tempDir: string;
  private uploadHandler: multer.Multer;
  private ocrService: OCRService;

  constructor(ocrService: OCRService) {
    this.ocrService = ocrService;
    this.tempDir = path.join(__dirname, "../../temp");
    this.ensureTempDirectoryExists();
    this.uploadHandler = this.configureMulter();
  }

  /**
   * Ensure the temporary directory exists
   */
  private ensureTempDirectoryExists(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Configure Multer for file uploads
   */
  private configureMulter(): multer.Multer {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.tempDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    });

    const fileFilter = (
      req: Request,
      file: Express.Multer.File,
      cb: multer.FileFilterCallback
    ) => {
      const allowedFileTypes = /jpeg|jpg|png|gif|pdf/;
      const ext = path.extname(file.originalname).toLowerCase();
      const mimetype = allowedFileTypes.test(file.mimetype);
      const extname = allowedFileTypes.test(ext);

      if (mimetype && extname) {
        return cb(null, true);
      }

      cb(new Error("Only .jpeg, .jpg, .png, .gif and .pdf files are allowed"));
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    });
  }

  /**
   * Get the Multer middleware configured for array uploads
   */
  public getUploadMiddleware() {
    return this.uploadHandler.array("files", 5);
  }

  /**
   * Process a single file and extract text
   */
  public async processFile(filePath: string): Promise<string[]> {
    // Extract text from file (image or PDF)
    const extractedTexts = await this.ocrService.processFile(filePath);

    // Chunk each extracted text
    const chunkedTexts: string[] = [];

    for (const text of extractedTexts) {
      // Split text into manageable chunks
      const chunks = this.ocrService.chunkText(text);
      chunkedTexts.push(...chunks);
    }

    return chunkedTexts;
  }

  /**
   * Delete temporary files
   */
  public cleanupFiles(filePaths: string[]): void {
    filePaths.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to delete temp file ${filePath}:`, error);
      }
    });
  }
}
