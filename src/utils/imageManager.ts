import ImageKit from "imagekit";
import { UploadResponse } from "imagekit/dist/libs/interfaces";
import fs from "fs";
interface ImageResponse {
  url: string;
  public_id: string;
}

interface ImageKitConfig {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

/**
 * Manages image operations using ImageKit service
 */
export class ImageManager {
  private readonly imageKit: ImageKit;

  constructor(config?: Partial<ImageKitConfig>) {
    if (
      !process.env.IMAGEKIT_PUBLIC_KEY ||
      !process.env.IMAGEKIT_PRIVATE_KEY ||
      !process.env.IMAGEKIT_URL_ENDPOINT
    ) {
      throw new Error(
        "ImageKit configuration is missing required environment variables"
      );
    }

    this.imageKit = new ImageKit({
      publicKey: config?.publicKey ?? process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: config?.privateKey ?? process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: config?.urlEndpoint ?? process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }

  /**
   * Uploads an image to ImageKit
   * @param filePath - Path to the image file
   * @returns Promise containing the upload response
   * @throws Error if upload fails or if file path is empty
   */
  public async uploadImage(filePath: string): Promise<ImageResponse> {
    if (!filePath) {
      throw new Error("File path is required");
    }

    try {
      const fileName = this.generateUniqueFileName();
      const result: UploadResponse = await this.imageKit.upload({
        file: fs.readFileSync(filePath),
        fileName,
      });

      return {
        url: result.url,
        public_id: result.fileId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[ImageManager] Upload failed:", errorMessage);
      throw new Error(`Image upload failed: ${errorMessage}`);
    }
  }

  /**
   * Deletes an image from ImageKit
   * @param fileId - ID of the file to delete
   * @throws Error if deletion fails
   */
  public async deleteImage(fileId: string): Promise<void> {
    try {
      await this.imageKit.deleteFile(fileId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[ImageManager] Deletion failed:", errorMessage);
      throw new Error(`Image deletion failed: ${errorMessage}`);
    }
  }

  /**
   * Updates an existing image by deleting the old one and uploading a new one
   * @param fileId - ID of the file to update
   * @param filePath - Path to the new image file
   * @returns Promise containing the update response
   * @throws Error if update fails
   */
  public async updateImage(
    fileId: string,
    filePath: string
  ): Promise<ImageResponse> {
    try {
      await this.deleteImage(fileId);
      return await this.uploadImage(filePath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[ImageManager] Update failed:", errorMessage);
      throw new Error(`Image update failed: ${errorMessage}`);
    }
  }

  /**
   * Generates a unique filename for uploaded images
   * @private
   */
  private generateUniqueFileName(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    return `${timestamp}-${randomString}`;
  }
}
