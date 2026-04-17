const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const questions = [
  // Session 1: SQL Queries
  {
    question: "Find average marks of students grouped by Name.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT Name, AVG(Marks) FROM Students GROUP BY Name;",
    marks: 10
  },
  {
    question: "Count number of students with same marks.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT Marks, COUNT(*) FROM Students GROUP BY Marks;",
    marks: 10
  },
  {
    question: "Show names having average marks > 70.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT Name, AVG(Marks) FROM Students GROUP BY Name HAVING AVG(Marks) > 70;",
    marks: 10
  },
  {
    question: "Find marks that appear more than once.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT Marks, COUNT(*) FROM Students GROUP BY Marks HAVING COUNT(*) > 1;",
    marks: 10
  },
  {
    question: "Create a view for students with marks > 75.",
    question_type: "code",
    options: [],
    correct_answer: "CREATE VIEW HighScorers AS SELECT ID, Name, Marks FROM Students WHERE Marks > 75;",
    marks: 10
  },
  {
    question: "Display the created view.",
    question_type: "code",
    options: [],
    correct_answer: "SELECT * FROM HighScorers;",
    marks: 10
  },
  
  // Session 1: MCQs
  {
    question: "What is a view in SQL?",
    question_type: "mcq",
    options: ["Physical table", "Virtual table", "Index", "Schema"],
    correct_answer: "Virtual table",
    marks: 5
  },
  {
    question: "Views are mainly used for:",
    question_type: "mcq",
    options: ["Data security", "Simplification", "Data abstraction", "All of the above"],
    correct_answer: "All of the above",
    marks: 5
  },
  {
    question: "Primary key is represented by:",
    question_type: "mcq",
    options: ["Double oval", "Underlined attribute", "Diamond", "Rectangle"],
    correct_answer: "Underlined attribute",
    marks: 5
  },
  {
    question: "Logical level describes:",
    question_type: "mcq",
    options: ["Storage details", "What data is stored", "Hardware", "None"],
    correct_answer: "What data is stored",
    marks: 5
  },
  {
    question: "Second Normal Form removes:",
    question_type: "mcq",
    options: ["Multivalued dependency", "Partial dependency", "Transitive dependency", "None"],
    correct_answer: "Partial dependency",
    marks: 5
  },
  {
    question: "BCNF is stricter than:",
    question_type: "mcq",
    options: ["1NF", "2NF", "3NF", "None"],
    correct_answer: "3NF",
    marks: 5
  },
  {
    question: "ACID stands for:",
    question_type: "mcq",
    options: ["Atomicity, Consistency, Isolation, Durability", "Accuracy, Consistency, Integrity, Data", "Atomic, Control, Isolation, Data", "None"],
    correct_answer: "Atomicity, Consistency, Isolation, Durability",
    marks: 5
  },
  {
    question: "Which command saves transaction permanently?",
    question_type: "mcq",
    options: ["SAVE", "COMMIT", "ROLLBACK", "END"],
    correct_answer: "COMMIT",
    marks: 5
  },
  {
    question: "If a transaction fails, it goes to:",
    question_type: "mcq",
    options: ["Committed", "Active", "Failed", "Durable"],
    correct_answer: "Failed",
    marks: 5
  },
  {
    question: "Which problem occurs when two transactions update same data?",
    question_type: "mcq",
    options: ["Dirty read", "Lost update", "Phantom read", "Deadlock"],
    correct_answer: "Lost update",
    marks: 5
  },
  {
    question: "Reading uncommitted data is called:",
    question_type: "mcq",
    options: ["Dirty read", "Safe read", "Phantom read", "Stable read"],
    correct_answer: "Dirty read",
    marks: 5
  },
  
  // Session 1: Fill in the Blanks
  {
    question: "Second Normal Form (2NF) removes __________ dependency.",
    question_type: "paragraph",
    options: [],
    correct_answer: "partial",
    marks: 5
  },
  {
    question: "The command used to undo changes is __________.",
    question_type: "paragraph",
    options: [],
    correct_answer: "ROLLBACK",
    marks: 5
  },
  {
    question: "The property that ensures no interference between transactions is __________.",
    question_type: "paragraph",
    options: [],
    correct_answer: "Isolation",
    marks: 5
  },
  {
    question: "A __________ key is a field that links two tables.",
    question_type: "paragraph",
    options: [],
    correct_answer: "foreign",
    marks: 5
  },
  {
    question: "A key that can have multiple attributes is called __________ key.",
    question_type: "paragraph",
    options: [],
    correct_answer: "composite",
    marks: 5
  },
  
  // Session 2: Additional MCQs
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
  
  // Session 2: Additional Fill in the Blanks
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
  
  // Session 2: Additional SQL Queries
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
  console.log("Setting up MYSQL EXAM...");
  
  // 1. Create the exam
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .insert({
      title: "MYSQL",
      description: "Comprehensive MySQL Exam covering queries, normalization, and ACID properties",
      duration_minutes: 60,
      max_violations: 3,
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
    console.log(`All ${questions.length} questions inserted successfully into the MYSQL exam!`);
  }
}

setupExam();
