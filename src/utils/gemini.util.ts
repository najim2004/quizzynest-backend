import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Category } from "@prisma/client";

dotenv.config();

export class GeminiService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async generateQuizFromText(
    text: string,
    categories: Pick<Category, "id" | "name">[]
  ): Promise<any[]> {
    try {
      const categoriesInfo = categories
        .map((cat) => `"${cat.id}": "${cat.name}"`)
        .join(",\n    ");

      const prompt = `
You are a multilingual quiz question generator.

Your task is to read the following text and generate as many high-quality multiple-choice quiz questions as possible — in the **same language** as the input text.

Text:
""" 
${text} 
"""

Available categories:
{
    ${categoriesInfo}
}

Instructions:
- Ask questions that are clear, direct, and do NOT refer to specific lines, phrases, or quotes from the text.
- Do NOT use wording like "According to the text", "What does the word X mean", or "In line Y".
- Instead, ask self-contained, meaningful questions that a reader can answer if they understood the content.
- The language of the questions and answers must match the input text language.
- Select the most appropriate categoryId from the available categories list above.
- Return only an array of JSON objects, no explanations or markdown.

Each object must follow this structure:
{
  "question": "...",
  "description": "...", 
  "timeLimit": [15-60],
  "maxPrize": [50-500],
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "categoryId": "<must be one of the available category IDs>",
  "answers": [
    { "label": "A", "text": "...", "isCorrect": true },
    { "label": "B", "text": "...", "isCorrect": false },
    { "label": "C", "text": "...", "isCorrect": false },
    { "label": "D", "text": "...", "isCorrect": false }
  ]
}
`;

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-pro-exp-03-25",
        contents: prompt,
      });
      const textResponse = response?.text;

      const jsonMatch = textResponse?.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from Gemini AI");
      }

      const quizQuestions: any[] = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
        throw new Error("No quiz questions generated");
      }

      return quizQuestions;
    } catch (error) {
      console.error("Error generating quiz from text:", error);
      throw new Error(`Quiz generation failed: ${(error as Error).message}`);
    }
  }
}

export const geminiService = new GeminiService();
