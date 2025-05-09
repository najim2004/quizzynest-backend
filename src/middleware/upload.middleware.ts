import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Configure file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = allowedFileTypes.test(file.mimetype);
  const extname = allowedFileTypes.test(ext);
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  
  cb(new Error('Only .jpeg, .jpg, .png, .gif and .pdf files are allowed'));
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Middleware to handle file uploads
export const uploadFiles = (req: Request, res: Response, next: NextFunction) => {
  // Accept up to 5 files
  const uploadMiddleware = upload.array('files', 5);
  
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error occurred
      return res.status(400).json({ 
        success: false,
        message: `Upload error: ${err.message}` 
      });
    } else if (err) {
      // Unknown error occurred
      return res.status(500).json({ 
        success: false,
        message: `Unknown error: ${err.message}` 
      });
    }
    
    // Files uploaded successfully
    next();
  });
};

// Helper function to delete temporary files
export const deleteTempFiles = (filePaths: string[]) => {
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete temp file ${filePath}:`, error);
    }
  });
};