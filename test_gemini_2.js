import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = "AIzaSyDawC5xSrI6K95DlGwAcuKgbJhLocE73Sg";
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
  console.log("Testing Gemini 2.0 Flash...");
  try {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent("Return a JSON array with one object: { 'score': 5, 'feedback': 'Good' }");
    console.log("\nGEMINI RESPONSE:", result.response.text().trim());
    process.exit(0);
  } catch (error) {
    console.error("\nGEMINI ERROR:", error.message);
    process.exit(1);
  }
}
test();
