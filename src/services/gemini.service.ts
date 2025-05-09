import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// Interface for quiz question
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
  }

  /**
   * Generate quiz questions from a text chunk
   * @param textChunk - The text to generate quiz from
   * @param questionsCount - Number of questions to generate (default: 3)
   */
  async generateQuizFromText(textChunk: string, questionsCount: number = 3): Promise<QuizQuestion[]> {
    try {
      // Create the prompt for generating quiz questions
      const prompt = `
        Generate ${questionsCount} multiple choice questions from the following text.
        The text may contain both English and Bengali content.
        
        For each question:
        1. Create a clear question related to the main concepts.
        2. Provide 4 options with exactly one correct answer.
        3. Clearly indicate which option is correct.
        4. Provide a brief explanation for the correct answer.
        
        Format the output as a valid JSON array of objects with the following structure:
        [
          {
            "question": "Question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "The correct option text",
            "explanation": "Explanation for the correct answer"
          }
        ]
        
        Here is the text:
        
        ${textChunk}
      `;

      // Get the response from Gemini AI
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract the JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        throw new Error('Failed to generate quiz questions: Invalid response format');
      }
      
      const quizQuestions: QuizQuestion[] = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
        throw new Error('Failed to generate quiz questions: Empty response');
      }
      
      return quizQuestions;
    } catch (error) {
      console.error('Error generating quiz from text:', error);
      throw new Error(`Quiz generation failed: ${(error as Error).message}`);
    }
  }
}

export const geminiService = new GeminiService();