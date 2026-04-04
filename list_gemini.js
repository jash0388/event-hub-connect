import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = "AIzaSyByvtqmSfAQ-YB5YO1EXn_yXepau8sq8M0";
const genAI = new GoogleGenerativeAI(API_KEY);

async function list() {
  console.log("Listing Available Models...");
  try {
    const listModels = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Not needed yet
    // Actually the SDK doesn't expose a simple listModels easily in the same way without direct fetching
    // I will try gemini-1.5-flash-latest and gemini-1.5-pro-latest
    
    const attempts = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash-exp", "gemini-1.0-pro"];
    for (const modelName of attempts) {
       try {
         const model = genAI.getGenerativeModel({ model: modelName });
         const result = await model.generateContent("TEST");
         console.log(`\nSUCCESS WITH: ${modelName}`);
         process.exit(0);
       } catch (e) {
         console.log(`FAILED WITH: ${modelName}`);
       }
    }
    process.exit(1);
  } catch (error) {
    console.error("\nGEMINI ERROR:", error.message);
    process.exit(1);
  }
}
list();
