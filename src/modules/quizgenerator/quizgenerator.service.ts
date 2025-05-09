import { v4 as uuidv4 } from "uuid";
import { ocrService } from "../../utils/ocr.util";
import { geminiService } from "../../utils/gemini.util";
import { jobQueueService, JobStatus } from "../../utils/job-queue.service";
import { deleteTempFiles } from "../../middleware/upload.middleware";

export class QuizGenerationService {
  async initiateQuizGeneration(
    files: Express.Multer.File[],
    userId: string
  ): Promise<{ jobId: string; fileCount: number }> {
    if (!files || files.length === 0) {
      throw new Error("No files uploaded");
    }

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
        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 10);
        let combinedText = "";
        let processedFiles = 0;

        for (const filePath of filePaths) {
          const extractedTexts = await ocrService.processFile(filePath);
          combinedText += extractedTexts.join("\n\n");
          processedFiles++;
          const fileProgress =
            Math.floor((processedFiles / filePaths.length) * 40) + 10;
          jobQueueService.updateJobStatus(
            jobId,
            JobStatus.PROCESSING,
            fileProgress
          );
        }

        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 50);
        const questions: any[] = await geminiService.generateQuizFromText(
          combinedText
        );

        jobQueueService.updateJobStatus(jobId, JobStatus.PROCESSING, 80);
        // const generatedQuiz = await quizGenerationRepository.saveGeneratedQuiz({
        //   title: "Generated Quiz from Files",
        //   description: "Quiz generated from uploaded files",
        //   userId: quizMetadata.userId,
        //   categoryId: "general_knowledge",
        //   questions,
        //   sourceFiles: quizMetadata.sourceFiles,
        // });

        deleteTempFiles(filePaths);

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

  async checkJobStatus(jobId: string, userId: string): Promise<any> {
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

  async getUserJobs(userId: string): Promise<any[]> {
    return jobQueueService.getUserJobs(userId);
  }
}

export const quizGenerationService = new QuizGenerationService();
