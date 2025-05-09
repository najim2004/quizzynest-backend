import { EventEmitter } from "events";

// Job status enum
export enum JobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Job interface
export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
}

/**
 * Service to manage background processing jobs
 */
export class JobQueueService {
  private jobs: Map<string, Job>;
  private eventEmitter: EventEmitter;

  constructor() {
    this.jobs = new Map();
    this.eventEmitter = new EventEmitter();
    // Increase max listeners to avoid memory leak warnings
    this.eventEmitter.setMaxListeners(100);
  }

  /**
   * Create a new job
   */
  public createJob(jobId: string, userId: number): Job {
    const job: Job = {
      id: jobId,
      status: JobStatus.PENDING,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    };

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Get a job by its ID
   */
  public getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update a job's status
   */
  public updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress: number = 0,
    result?: any,
    error?: string
  ): void {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = status;
    job.progress = progress;
    job.updatedAt = new Date();

    if (result !== undefined) {
      job.result = result;
    }

    if (error !== undefined) {
      job.error = error;
    }

    this.jobs.set(jobId, job);

    // Emit event for job update
    this.eventEmitter.emit(`job-updated:${jobId}`, job);
  }

  /**
   * Run a job in the background
   */
  public async runJobAsync<T>(
    jobId: string,
    task: () => Promise<T>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job status to processing
    this.updateJobStatus(jobId, JobStatus.PROCESSING);

    // Run the task asynchronously
    setTimeout(async () => {
      try {
        // If progress callback is provided, set up progress updates
        let progressHandler: ((progress: number) => void) | undefined;

        if (onProgress) {
          progressHandler = (progress: number) => {
            this.updateJobStatus(jobId, JobStatus.PROCESSING, progress);
            onProgress(progress);
          };
        }

        // Execute the task
        const result = await task();

        // Update job status to completed
        this.updateJobStatus(jobId, JobStatus.COMPLETED, 100, result);
      } catch (error) {
        console.error(`Error processing job ${jobId}:`, error);

        // Update job status to failed
        this.updateJobStatus(
          jobId,
          JobStatus.FAILED,
          0,
          undefined,
          error instanceof Error ? error.message : String(error)
        );
      }
    }, 0);
  }

  /**
   * Clean up completed/failed jobs older than the specified age (in milliseconds)
   */
  public cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = new Date().getTime();

    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - job.updatedAt.getTime();

      if (
        jobAge > maxAgeMs &&
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED)
      ) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Get all jobs for a specific user
   */
  public getUserJobs(userId: number): Job[] {
    const userJobs: Job[] = [];

    for (const job of this.jobs.values()) {
      if (job.userId === userId) {
        userJobs.push(job);
      }
    }

    return userJobs;
  }

  /**
   * Clean up completed/failed jobs for a specific user
   */
  public cleanupUserJobs(userId: number): void {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.userId === userId && 
         (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED)) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Set job result
   */
  public setJobResult(jobId: string, result: any): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.result = result;
      job.updatedAt = new Date();
    }
  }

  /**
   * Set job error
   */
  public setJobError(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = JobStatus.FAILED;
      job.error = error;
      job.updatedAt = new Date();
    }
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService();
