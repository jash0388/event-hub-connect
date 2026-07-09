const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function updateExamQuestions() {
  console.log("Updating DBMS EXAM 1 questions for better flexibility...");
  
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
  
  // 3. Update specific questions with alternatives
  for (const q of questions) {
    let newKey = q.correct_answer;
    
    // Add singular Student variations for SQL queries
    if (q.question.includes("Students") || q.correct_answer.includes("Students")) {
      if (!newKey.includes("|")) {
        newKey = `${q.correct_answer}|${q.correct_answer.replace(/Students/g, "Student")}`;
      }
    }
    
    if (newKey !== q.correct_answer) {
      const { error } = await supabase
        .from("exam_questions")
        .update({ correct_answer: newKey })
        .eq("id", q.id);
        
      if (error) console.error(`Error updating question ${q.id}:`, error);
      else console.log(`Updated question: "${q.question.substring(0, 30)}..."`);
    }
  }
  
  console.log("Flexibility updates complete!");
}

updateExamQuestions();
