const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: exams, error: examsError } = await supabase.from("exams").select("*").limit(1);
  if (examsError) {
    console.error("Error fetching exams:", examsError);
  } else {
    console.log("Exam columns:", Object.keys(exams[0] || {}));
  }

  const { data: questions, error: questionsError } = await supabase.from("exam_questions").select("*").limit(1);
  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
  } else {
    console.log("Question columns:", Object.keys(questions[0] || {}));
  }
}

check();
