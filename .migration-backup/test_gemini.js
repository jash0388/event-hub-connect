import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = "AIzaSyDawC5xSrI6K95DlGwAcuKgbJhLocE73Sg";
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
  console.log("Testing New Gemini API Key...");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say 'AI IS WORKING' and nothing else.");
    console.log("\nGEMINI RESPONSE:", result.response.text().trim());
    process.exit(0);
  } catch (error) {
    console.error("\nGEMINI ERROR:", error.message);
    process.exit(1);
  }
}
test();
