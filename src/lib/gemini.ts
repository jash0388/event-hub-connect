import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyByvtqmSfAQ-YB5YO1EXn_yXepau8sq8M0";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface GradingResult {
  score: number;
  feedback: string;
}

export async function gradeExam(batch: Array<{ question: string, correctAnswer: string, userAnswer: string, maxMarks: number }>): Promise<GradingResult[]> {
  if (!API_KEY || batch.length === 0) {
    return batch.map(b => ({
      score: simpleGrade(b.correctAnswer, b.userAnswer, b.maxMarks),
      feedback: "Keyword match used (AI Unavailable)."
    }));
  }

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    generationConfig: { responseMimeType: "application/json" } 
  });

  const prompt = `
    You are an EXPERT TEACHER grading a student's exam. Grade each answer strictly but fairly.
    
    EXAM DATA (JSON ARRAY):
    ${JSON.stringify(batch)}

    CRITICAL INSTRUCTIONS:
    1. For each item, compare 'userAnswer' with 'correctAnswer'. If 'correctAnswer' is empty, use your knowledge.
    2. BE LENIENT with spacing and minor syntax errors, but deduct 1-2 points for them and explain why.
    3. PROVIDE DETAILED EXPLANATIONS in the 'feedback' field. If the answer is WRONG, explain what was missing or incorrect. If it is CORRECT, explain why it was correct or how it matches the key. 
    4. NO GENERIC FEEDBACK. Always give a high-quality human-like answer reasoning.

    
    OUTPUT FORMAT (JSON ARRAY of objects):
    [
      { "score": <number>, "feedback": "<Teacher's explanation>" },
      ...
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/); // Match array
    if (jsonMatch) text = jsonMatch[0];
    
    const results = JSON.parse(text);
    return batch.map((b, i) => ({
      score: isNaN(results[i]?.score) ? 0 : Math.min(Number(results[i].score), b.maxMarks),
      feedback: results[i]?.feedback || "No specific feedback."
    }));
  } catch (error) {
    console.error("Batch AI Grading failed:", error);
    return batch.map(b => ({
      score: simpleGrade(b.correctAnswer, b.userAnswer, b.maxMarks),
      feedback: "Automated keyword evaluation (AI Busy)."
    }));
  }
}

export async function gradeAnswer(question: string, correctAnswer: string, userAnswer: string, maxMarks: number): Promise<GradingResult> {
  const results = await gradeExam([{ question, correctAnswer, userAnswer, maxMarks }]);
  return results[0];
}




function simpleGrade(correctAnswer: string, userAnswer: string, maxMarks: number): number {
  if (!correctAnswer || correctAnswer.trim() === "") return 0; // Cannot fallback grade without a key

  const user = userAnswer.trim().toLowerCase();
  const correctStr = correctAnswer.trim().toLowerCase();
  const alternatives = correctStr.split('|').map(a => a.trim());

  for (const alt of alternatives) {
    if (alt.includes(',')) {
      const keywords = alt.split(',').map(k => k.trim().toLowerCase());
      if (keywords.length === 0) continue;
      const foundCount = keywords.filter(k => user.includes(k)).length;
      if (foundCount === keywords.length) return maxMarks;
      if (foundCount > 0) return Math.floor((foundCount / keywords.length) * maxMarks);
    } else {
      const target = alt.toLowerCase();
      if (user === target) return maxMarks;
      // Precise check: only match if it's a significant portion or exact word
      if (user.length > 2 && target.length > 2 && (user.includes(target) || target.includes(user))) {
        return Math.floor(maxMarks * 0.8); // Partial match
      }
    }
  }
  return 0;
}


