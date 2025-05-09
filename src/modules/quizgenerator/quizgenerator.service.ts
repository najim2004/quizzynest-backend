import { v4 as uuidv4 } from "uuid";
import { ocrService } from "../../utils/ocr.util";
import { geminiService } from "../../utils/gemini.util";
import { jobQueueService, JobStatus } from "../../utils/job-queue.service";
import { deleteTempFiles } from "../../middleware/upload.middleware";

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
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 5);
        let combinedText = "";
        let processedFiles = 0;

        // File processing - 5% to 45% (40% total for file processing)
        for (const filePath of filePaths) {
          // Start processing new file
          jobQueueService.updateJobStatus(
            jobId,
            JobStatus.PROCESSING,
            5 + Math.floor((processedFiles / filePaths.length) * 40)
          );

          const extractedTexts = await ocrService.processFile(filePath);
          combinedText += extractedTexts.join("\n\n");
          processedFiles++;

          // Update progress after each file
          jobQueueService.updateJobStatus(
            jobId,
            JobStatus.PROCESSING,
            5 + Math.floor((processedFiles / filePaths.length) * 40)
          );
        }

        // Text analysis start - 45%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 45);

        // AI model initialization - 50%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 50);

        // Generating questions - 55%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 55);
        const questions: any[] = await geminiService.generateQuizFromText(
          combinedText
        );

        // Questions generated - 65%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 65);
        console.log(questions);

        // Processing questions - 75%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 75);

        // Saving to database - 85%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 85);
        // const generatedQuiz = await quizGenerationRepository.saveGeneratedQuiz({
        //   title: "Generated Quiz from Files",
        //   description: "Quiz generated from uploaded files",
        //   userId: quizMetadata.userId,
        //   categoryId: "general_knowledge",
        //   questions,
        //   sourceFiles: quizMetadata.sourceFiles,
        // });

        // Cleanup - 95%
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 95);
        deleteTempFiles(filePaths);

        // Completing - 100%
        jobQueueService.updateJobStatus(jobId, JobStatus.COMPLETED, 100);

        return {
          // quizId: generatedQuiz.id,
          // title: generatedQuiz.title,
          // questionCount: generatedQuiz.questions.length,
        };
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
