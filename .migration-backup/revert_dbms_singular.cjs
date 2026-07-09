const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function revertExamQuestions() {
  console.log("Reverting DBMS EXAM 1 to strict pluralization (Students)...");
  
  // 1. Find the exam
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id")
    .eq("title", "DBMS EXAM 1")
    .single();
    
  if (examError || !exam) {
    console.error("Exam not found:", examError);
    return;
  }
  
  // 2. Fetch current questions
  const { data: questions, error: questionsError } = await supabase
    .from("exam_questions")
    .select("id, question, correct_answer")
    .eq("exam_id", exam.id);
    
  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
    return;
  }
  
  // 3. Revert to original (keep only the first part before '|')
  for (const q of questions) {
    if (q.correct_answer.includes("|")) {
      const originalKey = q.correct_answer.split("|")[0].trim();
      
      const { error } = await supabase
        .from("exam_questions")
        .update({ correct_answer: originalKey })
        .eq("id", q.id);
        
      if (error) console.error(`Error reverting question ${q.id}:`, error);
      else console.log(`Reverted question: "${q.question.substring(0, 30)}..." to "${originalKey}"`);
    }
  }
  
  console.log("Reversion complete. Spacing and capitalization will still be ignored.");
}

revertExamQuestions();
