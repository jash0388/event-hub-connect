const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const questions = [
  {
    question: "What does DBMS stand for?",
    question_type: "mcq",
    options: ["Data Backup Management System", "Database Management System", "Data Binary Management System", "Database Monitoring System"],
    correct_answer: "Database Management System",
    marks: 5
  },
  {
    question: "Which of the following is a type of database model?",
    question_type: "mcq",
    options: ["Relational", "Hierarchical", "Network", "All of the above"],
    correct_answer: "All of the above",
    marks: 5
  },
  {
    question: "What is a primary key?",
    question_type: "mcq",
    options: ["A key used to open the database", "A unique identifier for a record", "A duplicate key", "A foreign identifier"],
    correct_answer: "A unique identifier for a record",
    marks: 5
  },
  {
    question: "Which SQL command is used to retrieve data?",
    question_type: "mcq",
    options: ["INSERT", "UPDATE", "SELECT", "DELETE"],
    correct_answer: "SELECT",
    marks: 5
  },
  {
    question: "What is normalization?",
    question_type: "mcq",
    options: ["Process of data duplication", "Organizing data to reduce redundancy", "Deleting data from database", "Creating backups"],
    correct_answer: "Organizing data to reduce redundancy",
    marks: 5
  },
  {
    question: "Which of the following is NOT a DDL command?",
    question_type: "mcq",
    options: ["CREATE", "ALTER", "DROP", "UPDATE"],
    correct_answer: "UPDATE",
    marks: 5
  },
  {
    question: "What is a foreign key?",
    question_type: "mcq",
    options: ["A key that links two tables", "A duplicate key", "A temporary key", "A key used for encryption"],
    correct_answer: "A key that links two tables",
    marks: 5
  },
  {
    question: "Which language is used to interact with DBMS?",
    question_type: "mcq",
    options: ["HTML", "SQL", "XML", "C++"],
    correct_answer: "SQL",
    marks: 5
  },
  {
    question: "Which of the following is a NoSQL database?",
    question_type: "mcq",
    options: ["MySQL", "Oracle", "MongoDB", "PostgreSQL"],
    correct_answer: "MongoDB",
    marks: 5
  },
  {
    question: "Which normal form removes partial dependency?",
    question_type: "mcq",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correct_answer: "2NF",
    marks: 5
  },
  // Fill in the blanks
  {
    question: "A table in a database is also known as a ________.",
    question_type: "paragraph",
    options: [],
    correct_answer: "Relation",
    marks: 5
  },
  {
    question: "The command used to remove a table from a database is ________.",
    question_type: "paragraph",
    options: [],
    correct_answer: "DROP",
    marks: 5
  },
  {
    question: "The SQL clause used to filter records is ________.",
    question_type: "paragraph",
    options: [],
    correct_answer: "WHERE",
    marks: 5
  },
  {
    question: "The ________ command is used to modify existing data in a table.",
    question_type: "paragraph",
    options: [],
    correct_answer: "UPDATE",
    marks: 5
  },
  {
    question: "A ________ ensures referential integrity between tables.",
    question_type: "paragraph",
    options: [],
    correct_answer: "Foreign Key",
    marks: 5
  },
  // SQL Queries
  {
    question: "Write a query to display only Name and Marks of all students.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT Name, Marks FROM Students;",
    marks: 10
  },
  {
    question: "Write a query to update marks of a student whose ID is 1.",
    question_type: "code",
    options: [],
    correct_answer: "UPDATE Students SET Marks = 90 WHERE ID = 1;",
    marks: 10
  },
  {
    question: "Write a query to display students whose name starts with 'A'.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT * FROM Students WHERE Name LIKE 'A%';",
    marks: 10
  },
  {
    question: "Write a query to sort students by Marks in descending order.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT * FROM Students ORDER BY Marks DESC;",
    marks: 10
  },
  {
    question: "Write a query to find the maximum marks.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT MAX(Marks) FROM Students;",
    marks: 10
  }
];

async function setupExam() {
  console.log("Setting up DBMS EXAM 1...");
  
  // 1. Create the exam
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .insert({
      title: "DBMS EXAM 1",
      description: "Fundamental Database Management Systems Exam",
      duration_minutes: 30,
      max_violations: 2,
      is_active: true
    })
    .select()
    .single();
    
  if (examError) {
    console.error("Error creating exam:", examError);
    return;
  }
  
  console.log("Exam created with ID:", exam.id);
  
  // 2. Add questions
  const questionsToInsert = questions.map((q, index) => ({
    ...q,
    exam_id: exam.id,
    sort_order: index
  }));
  
  const { error: questionsError } = await supabase
    .from("exam_questions")
    .insert(questionsToInsert);
    
  if (questionsError) {
    console.error("Error inserting questions:", questionsError);
  } else {
    console.log("All 20 questions inserted successfully!");
  }
}

setupExam();
