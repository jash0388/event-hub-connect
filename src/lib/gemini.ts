import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDawC5xSrI6K95DlGwAcuKgbJhLocE73Sg";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

export interface GradingResult {
  score: number;
  feedback: string;
  gradedBy?: 'gemini' | 'groq' | 'fallback';
}

// Timeout helper
const withTimeout = <T>(promise: Promise<T>, ms: number) => {
  let timeoutId: any;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('AI Request Timeout')), ms);
    })
  ]).finally(() => clearTimeout(timeoutId));
};

const GRADING_PROMPT = (batch: any[]) => `
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

async function gradeWithGemini(batch: any[]): Promise<GradingResult[]> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    generationConfig: { responseMimeType: "application/json" } 
  });

  const result = await withTimeout(model.generateContent(GRADING_PROMPT(batch)), 4000) as any;
  let text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) text = jsonMatch[0];
  
  const results = JSON.parse(text);
  return batch.map((b, i) => ({
    score: isNaN(results[i]?.score) ? 0 : Math.min(Number(results[i].score), b.maxMarks),
    feedback: results[i]?.feedback || "No specific feedback.",
    gradedBy: 'gemini'
  }));
}

async function gradeWithGroq(batch: any[]): Promise<GradingResult[]> {
  if (!GROQ_KEY) throw new Error("Groq API Key missing");

  const response = await withTimeout(fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: GRADING_PROMPT(batch) }],
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  }), 4000);

  if (!response.ok) throw new Error(`Groq API Error: ${response.status}`);
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Groq might return the array inside a root object or just the array string
  let results;
  try {
    const parsed = JSON.parse(content);
    results = Array.isArray(parsed) ? parsed : (parsed.results || Object.values(parsed)[0]);
  } catch (e) {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    results = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  return batch.map((b, i) => ({
    score: isNaN(results[i]?.score) ? 0 : Math.min(Number(results[i].score), b.maxMarks),
    feedback: results[i]?.feedback || "No specific feedback.",
    gradedBy: 'groq'
  }));
}

export async function gradeExam(batch: Array<{ question: string, correctAnswer: string, userAnswer: string, maxMarks: number }>): Promise<GradingResult[]> {
  if (batch.length === 0) return [];

  // Try Gemini First
  try {
    return await gradeWithGemini(batch);
  } catch (error: any) {
    console.warn("[AI Grade] Gemini failed, falling back to Groq:", error.message);
    
    // Fallback to Groq
    try {
      return await gradeWithGroq(batch);
    } catch (groqError: any) {
      console.error("[AI Grade] Groq fallback failed:", groqError.message);
      
      // Final Fallback: Simple Keyword Logic
      return batch.map(b => ({
        score: simpleGrade(b.correctAnswer, b.userAnswer, b.maxMarks),
        feedback: "Automated evaluation via secure database keys (AI Busy).",
        gradedBy: 'fallback'
      }));
    }
  }
}

export async function gradeAnswer(question: string, correctAnswer: string, userAnswer: string, maxMarks: number): Promise<GradingResult> {
  const results = await gradeExam([{ question, correctAnswer, userAnswer, maxMarks }]);
  return results[0];
}

function simpleGrade(correctAnswer: string, userAnswer: string, maxMarks: number): number {
  if (!correctAnswer || correctAnswer.trim() === "") return 0;

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
      if (user.length > 2 && target.length > 2 && (user.includes(target) || target.includes(user))) {
        return Math.floor(maxMarks * 0.8);
      }
    }
  }
  return 0;
}
