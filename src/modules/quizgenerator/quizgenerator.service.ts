import { v4 as uuidv4 } from "uuid";
import { ocrService } from "../../utils/ocr.util";
import { geminiService } from "../../utils/gemini.util";
import { jobQueueService, JobStatus } from "../../utils/job-queue.service";
import { deleteTempFiles } from "../../middleware/upload.middleware";
import { Category } from "@prisma/client";
import { quizGenerationRepository } from "./quiz-generation.repository";

export class QuizGenerationService {
  async initiateQuizGeneration(
    files: Express.Multer.File[],
    userId: number
  ): Promise<{ jobId: string; fileCount: number }> {
    if (!files || files.length === 0) {
      throw new Error("No files uploaded");
    }

    // Check if user has any ongoing jobs
    const userJobs = jobQueueService.getUserJobs(userId);
    const hasOngoingJob = userJobs.some(
      (job) =>
        job.status === JobStatus.PROCESSING || job.status === JobStatus.PENDING
    );

    if (hasOngoingJob) {
      throw new Error(
        "You have an ongoing quiz generation process. Please wait for it to complete."
      );
    }

    // Clean up completed or failed jobs for this user
    jobQueueService.cleanupUserJobs(userId);

    const jobId = uuidv4();
    jobQueueService.createJob(jobId, userId);

    const filePaths = files.map((file) => file.path);
    const fileNames = files.map((file) => file.originalname);

    this.processFilesAsync(jobId, filePaths, {
      userId,
      sourceFiles: fileNames,
    });

    return { jobId, fileCount: files.length };
  }

  private async processFilesAsync(
    jobId: string,
    filePaths: string[],
    quizMetadata: any
  ): Promise<void> {
    jobQueueService.runJobAsync(jobId, async () => {
      try {
        // Initialize processing - 5%
        const categories: Pick<Category, "id" | "name">[] =
          await quizGenerationRepository.getCategories();
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 5);
        let processedFiles = 0;
        const allQuestions: any[] = []; // Array to store all generated questions

        // File processing - 5% to 45% (40% total for file processing)
        for (const filePath of filePaths) {
          jobQueueService.updateJobStatus(
            jobId,
            JobStatus.PROCESSING,
            5 + Math.floor((processedFiles / filePaths.length) * 40)
          );

          const textChunks = await ocrService.processFile(filePath);
          processedFiles++;

          // Process each chunk separately - Calculate progress per chunk
          const chunksCount = textChunks.length;
          for (let i = 0; i < chunksCount; i++) {
            const chunk = textChunks[i];
            const chunkProgress = Math.floor((i / chunksCount) * 40);

            jobQueueService.updateJobStatus(
              jobId,
              JobStatus.PROCESSING,
              45 + chunkProgress
            );

            // Generate questions for this chunk
            const chunkQuestions: any[] =
              await geminiService.generateQuizFromText(chunk, categories);

            // Add questions from this chunk to our collection
            allQuestions.push(...chunkQuestions);
          }
        }

        // Questions generated - 85%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 85);
        console.log(`Total questions generated: ${allQuestions.length}`);

        // Saving to database - 90%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 90);
        await quizGenerationRepository.createQuizzesWithAnswers(
          allQuestions,
          quizMetadata.userId
        );

        // Cleanup - 95%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 95);
        deleteTempFiles(filePaths);

        // Completing - 100%
        jobQueueService.updateJobStatus(jobId, JobStatus.COMPLETED, 100);
      } catch (error) {
        deleteTempFiles(filePaths);
        throw error;
      }
    });
  }

  async checkJobStatus(jobId: string, userId: number): Promise<any> {
    const job = jobQueueService.getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    if (job.userId !== userId) {
      throw new Error("You do not have permission to view this job");
    }
    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async getUserJobs(userId: number): Promise<any[]> {
    return jobQueueService.getUserJobs(userId);
  }
}

export const quizGenerationService = new QuizGenerationService();
