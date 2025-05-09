import fs from 'fs';
import path from 'path';

/**
 * Cleans up all files in the temp directory
 */
export const cleanupTempDirectory = (): void => {
  const tempDir = path.join(__dirname, '../../temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    return;
  }

  // Read all files in the temp directory
  const files = fs.readdirSync(tempDir);
  
  // Delete each file
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`[Cleanup] Failed to delete temp file ${filePath}:`, error);
    }
  });

  console.log(`[Cleanup] Successfully cleaned up ${files.length} files from temp directory`);
};