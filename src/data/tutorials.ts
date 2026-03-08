// Tutorial data — W3Schools-style course content for DataNauts Learn

export interface TutorialLesson {
    id: string;
    title: string;
    content: string; // HTML content
    code?: string;
    language?: string;
    output?: string;
}

export interface TutorialTopic {
    id: string;
    title: string;
    icon: string;
    color: string;
    gradient: string;
    description: string;
    lessons: TutorialLesson[];
}

export interface TutorialCategory {
    id: string;
    title: string;
    topics: TutorialTopic[];
}

export const tutorialCategories: TutorialCategory[] = [
    {
        id: "web",
        title: "Web Development",
        topics: [
            {
                id: "html",
                title: "HTML",
                icon: "🌐",
                color: "#E44D26",
                gradient: "linear-gradient(135deg, #E44D26, #F16529)",
                description: "The language for building web pages",
                lessons: [
                    {
                        id: "html-intro",
                        title: "HTML Introduction",
                        content: `<h2>What is HTML?</h2>
<p>HTML stands for <strong>Hyper Text Markup Language</strong>. It is the standard markup language for creating Web pages.</p>
<ul>
<li>HTML describes the structure of a Web page</li>
<li>HTML consists of a series of elements</li>
<li>HTML elements tell the browser how to display the content</li>
<li>HTML elements label pieces of content such as "this is a heading", "this is a paragraph", "this is a link", etc.</li>
</ul>
<h3>A Simple HTML Document</h3>
<p>Below is an example of a simple HTML page:</p>`,
                        code: `<!DOCTYPE html>
<html>
<head>
  <title>My First Page</title>
</head>
<body>
  <h1>My First Heading</h1>
  <p>My first paragraph.</p>
</body>
</html>`,
                        language: "html",
                        output: "<h1>My First Heading</h1><p>My first paragraph.</p>"
                    },
                    {
                        id: "html-elements",
                        title: "HTML Elements",
                        content: `<h2>HTML Elements</h2>
<p>An HTML element is defined by a <strong>start tag</strong>, some <strong>content</strong>, and an <strong>end tag</strong>.</p>
<p>The HTML element is everything from the start tag to the end tag:</p>
<code>&lt;tagname&gt; Content goes here... &lt;/tagname&gt;</code>
<h3>Examples of HTML Elements</h3>
<ul>
<li><code>&lt;h1&gt;</code> to <code>&lt;h6&gt;</code> — Headings</li>
<li><code>&lt;p&gt;</code> — Paragraphs</li>
<li><code>&lt;a&gt;</code> — Links</li>
<li><code>&lt;img&gt;</code> — Images</li>
<li><code>&lt;div&gt;</code> — Sections</li>
</ul>`,
                        code: `<!DOCTYPE html>
<html>
<body>
  <h1>This is a Heading</h1>
  <h2>This is a smaller Heading</h2>
  <p>This is a paragraph.</p>
  <a href="https://datanauts.com">This is a link</a>
</body>
</html>`,
                        language: "html",
                        output: "<h1>This is a Heading</h1><h2>This is a smaller Heading</h2><p>This is a paragraph.</p><a href='#'>This is a link</a>"
                    },
                    {
                        id: "html-attributes",
                        title: "HTML Attributes",
                        content: `<h2>HTML Attributes</h2>
<p>HTML attributes provide <strong>additional information</strong> about HTML elements.</p>
<ul>
<li>All HTML elements can have attributes</li>
<li>Attributes provide additional information about elements</li>
<li>Attributes are always specified in the start tag</li>
<li>Attributes usually come in name/value pairs like: <code>name="value"</code></li>
</ul>
<h3>Common Attributes</h3>
<ul>
<li><code>href</code> — Specifies the URL for a link</li>
<li><code>src</code> — Specifies the source file for an image</li>
<li><code>class</code> — Specifies the CSS class</li>
<li><code>id</code> — Specifies a unique id</li>
<li><code>style</code> — Specifies inline CSS</li>
</ul>`,
                        code: `<!DOCTYPE html>
<html>
<body>
  <h2 style="color: blue;">A Blue Heading</h2>
  <p style="color: red;">A red paragraph.</p>
  <a href="https://example.com" target="_blank">
    Visit Example
  </a>
  <img src="https://via.placeholder.com/150" 
       alt="Placeholder" width="150">
</body>
</html>`,
                        language: "html",
                        output: `<h2 style="color: blue;">A Blue Heading</h2><p style="color: red;">A red paragraph.</p>`
                    },
                    {
                        id: "html-forms",
                        title: "HTML Forms",
                        content: `<h2>HTML Forms</h2>
<p>An HTML form is used to collect user input. The user input is most often sent to a server for processing.</p>
<h3>The &lt;form&gt; Element</h3>
<p>The <code>&lt;form&gt;</code> element is used to create an HTML form. It can contain different types of input elements like text fields, checkboxes, radio buttons, submit buttons, etc.</p>
<h3>Common Input Types</h3>
<ul>
<li><code>&lt;input type="text"&gt;</code> — Text input</li>
<li><code>&lt;input type="password"&gt;</code> — Password input</li>
<li><code>&lt;input type="submit"&gt;</code> — Submit button</li>
<li><code>&lt;input type="email"&gt;</code> — Email input</li>
<li><code>&lt;textarea&gt;</code> — Multi-line text input</li>
<li><code>&lt;select&gt;</code> — Dropdown list</li>
</ul>`,
                        code: `<!DOCTYPE html>
<html>
<body>
  <h2>Student Registration</h2>
  <form action="/submit" method="post">
    <label for="name">Name:</label><br>
    <input type="text" id="name" name="name" 
           placeholder="Enter your name"><br><br>

    <label for="email">Email:</label><br>
    <input type="email" id="email" name="email" 
           placeholder="Enter your email"><br><br>

    <label for="branch">Branch:</label><br>
    <select id="branch" name="branch">
      <option value="cse">Computer Science</option>
      <option value="ece">Electronics</option>
      <option value="mech">Mechanical</option>
    </select><br><br>

    <input type="submit" value="Register">
  </form>
</body>
</html>`,
                        language: "html",
                    },
                ],
            },
            {
                id: "css",
                title: "CSS",
                icon: "🎨",
                color: "#264DE4",
                gradient: "linear-gradient(135deg, #264DE4, #2965F1)",
                description: "The language for styling web pages",
                lessons: [
                    {
                        id: "css-intro",
                        title: "CSS Introduction",
                        content: `<h2>What is CSS?</h2>
<p><strong>CSS</strong> stands for <strong>Cascading Style Sheets</strong>. CSS describes how HTML elements are to be displayed on screen.</p>
<ul>
<li>CSS saves a lot of work — it can control the layout of multiple web pages at once</li>
<li>CSS can control color, font, size, spacing, position, and more</li>
<li>External stylesheets are stored in <code>.css</code> files</li>
</ul>
<h3>CSS Syntax</h3>
<p>A CSS rule consists of a <strong>selector</strong> and a <strong>declaration block</strong>.</p>`,
                        code: `<!DOCTYPE html>
<html>
<head>
<style>
  body {
    background-color: #1a1a2e;
    font-family: Arial, sans-serif;
    color: white;
    text-align: center;
    padding: 50px;
  }
  h1 {
    color: #e94560;
    font-size: 3em;
  }
  p {
    color: #eaeaea;
    font-size: 1.2em;
  }
  .highlight {
    background: linear-gradient(135deg, #e94560, #0f3460);
    padding: 15px 30px;
    border-radius: 10px;
    display: inline-block;
    margin-top: 20px;
  }
</style>
</head>
<body>
  <h1>Hello CSS!</h1>
  <p>CSS makes websites beautiful.</p>
  <div class="highlight">
    Styled with CSS ✨
  </div>
</body>
</html>`,
                        language: "css",
                    },
                    {
                        id: "css-selectors",
                        title: "CSS Selectors",
                        content: `<h2>CSS Selectors</h2>
<p>CSS selectors are used to <strong>find</strong> (or select) the HTML elements you want to style.</p>
<h3>Types of Selectors</h3>
<ul>
<li><strong>Element Selector:</strong> <code>p { }</code> — Selects all &lt;p&gt; elements</li>
<li><strong>ID Selector:</strong> <code>#myId { }</code> — Selects element with id="myId"</li>
<li><strong>Class Selector:</strong> <code>.myClass { }</code> — Selects elements with class="myClass"</li>
<li><strong>Universal:</strong> <code>* { }</code> — Selects all elements</li>
<li><strong>Grouping:</strong> <code>h1, h2, p { }</code> — Selects multiple elements</li>
</ul>`,
                        code: `<!DOCTYPE html>
<html>
<head>
<style>
  /* Element selector */
  h1 { color: #D4AF37; }
  
  /* Class selector */
  .intro { 
    font-size: 1.2em; 
    color: #666; 
    border-left: 4px solid #D4AF37;
    padding-left: 15px;
  }
  
  /* ID selector */
  #special { 
    background: #f0f0f0; 
    padding: 20px; 
    border-radius: 8px; 
  }
  
  /* Grouping */
  h2, h3 { color: #333; }
</style>
</head>
<body>
  <h1>CSS Selectors Demo</h1>
  <p class="intro">This uses a class selector.</p>
  <div id="special">
    <h2>This uses an ID selector</h2>
    <p>Different selectors, different styles!</p>
  </div>
</body>
</html>`,
                        language: "css",
                    },
                    {
                        id: "css-flexbox",
                        title: "CSS Flexbox",
                        content: `<h2>CSS Flexbox</h2>
<p>The <strong>Flexbox Layout</strong> module makes it easier to design flexible responsive layout structures without using float or positioning.</p>
<h3>Flex Container Properties</h3>
<ul>
<li><code>display: flex</code> — Defines a flex container</li>
<li><code>flex-direction</code> — row, column, row-reverse, column-reverse</li>
<li><code>justify-content</code> — center, space-between, space-around</li>
<li><code>align-items</code> — center, flex-start, flex-end, stretch</li>
<li><code>flex-wrap</code> — wrap, nowrap</li>
<li><code>gap</code> — spacing between items</li>
</ul>`,
                        code: `<!DOCTYPE html>
<html>
<head>
<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    padding: 40px;
    min-height: 200px;
    background: #f5f5f5;
    border-radius: 12px;
  }
  .box {
    width: 100px;
    height: 100px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 1.2em;
  }
  .box:nth-child(1) { background: #E44D26; }
  .box:nth-child(2) { background: #264DE4; }
  .box:nth-child(3) { background: #F7DF1E; color: #333; }
  .box:nth-child(4) { background: #68A063; }
</style>
</head>
<body>
  <h2>Flexbox Layout</h2>
  <div class="container">
    <div class="box">1</div>
    <div class="box">2</div>
    <div class="box">3</div>
    <div class="box">4</div>
  </div>
</body>
</html>`,
                        language: "css",
                    },
                ],
            },
            {
                id: "javascript",
                title: "JavaScript",
                icon: "⚡",
                color: "#F7DF1E",
                gradient: "linear-gradient(135deg, #F7DF1E, #F0DB4F)",
                description: "The programming language of the web",
                lessons: [
                    {
                        id: "js-intro",
                        title: "JavaScript Introduction",
                        content: `<h2>What is JavaScript?</h2>
<p>JavaScript is the world's most popular programming language. It is the programming language of the Web.</p>
<ul>
<li>JavaScript can change HTML content and attributes</li>
<li>JavaScript can change CSS styles</li>
<li>JavaScript can hide and show HTML elements</li>
<li>JavaScript can validate user input</li>
<li>JavaScript can create dynamic and interactive web pages</li>
</ul>
<h3>Why Study JavaScript?</h3>
<p>JavaScript is one of the <strong>3 languages</strong> all web developers must learn: HTML, CSS, and JavaScript.</p>`,
                        code: `// JavaScript can change HTML
document.getElementById("demo").innerHTML = "Hello JavaScript!";

// JavaScript can change styles
document.getElementById("demo").style.color = "red";
document.getElementById("demo").style.fontSize = "24px";

// Variables
let name = "DataNauts";
const year = 2025;
var greeting = "Welcome to " + name;

// Output
console.log(greeting);
console.log("Year: " + year);

// Alert
alert("Hello from JavaScript! 🚀");`,
                        language: "javascript",
                    },
                    {
                        id: "js-variables",
                        title: "Variables & Data Types",
                        content: `<h2>JavaScript Variables</h2>
<p>Variables are containers for storing data values. In JavaScript, we use <code>let</code>, <code>const</code>, and <code>var</code> to declare variables.</p>
<h3>Data Types</h3>
<ul>
<li><strong>String:</strong> <code>"Hello"</code> — Text values</li>
<li><strong>Number:</strong> <code>42</code>, <code>3.14</code> — Numeric values</li>
<li><strong>Boolean:</strong> <code>true</code> / <code>false</code></li>
<li><strong>Array:</strong> <code>[1, 2, 3]</code> — List of values</li>
<li><strong>Object:</strong> <code>{name: "John", age: 20}</code></li>
<li><strong>Undefined:</strong> Variable without a value</li>
<li><strong>Null:</strong> Empty/nothing</li>
</ul>`,
                        code: `// let — can be reassigned
let score = 100;
score = 200;
console.log("Score:", score);

// const — cannot be reassigned
const PI = 3.14159;
const college = "Sphoorthy Engineering College";
console.log("College:", college);

// Data Types
let name = "Jashwanth";      // String
let age = 20;                 // Number
let isStudent = true;         // Boolean
let skills = ["JS", "React"]; // Array
let student = {               // Object
  name: "Jashwanth",
  branch: "CSE",
  year: 3
};

console.log("Name:", name);
console.log("Type:", typeof name);
console.log("Skills:", skills);
console.log("Student:", student);`,
                        language: "javascript",
                    },
                    {
                        id: "js-functions",
                        title: "Functions",
                        content: `<h2>JavaScript Functions</h2>
<p>A function is a block of code designed to perform a particular task. It is executed when "something" invokes it (calls it).</p>
<h3>Function Types</h3>
<ul>
<li><strong>Function Declaration:</strong> <code>function name() { }</code></li>
<li><strong>Function Expression:</strong> <code>const name = function() { }</code></li>
<li><strong>Arrow Function:</strong> <code>const name = () => { }</code></li>
</ul>
<h3>Parameters & Return</h3>
<p>Functions can accept <strong>parameters</strong> and <strong>return</strong> values.</p>`,
                        code: `// Function Declaration
function greet(name) {
  return "Hello, " + name + "! 👋";
}
console.log(greet("DataNauts"));

// Arrow Function
const add = (a, b) => a + b;
console.log("2 + 3 =", add(2, 3));

// Function with default parameter
const welcome = (name = "Student") => {
  return \`Welcome to DataNauts, \${name}!\`;
};
console.log(welcome());
console.log(welcome("Jashwanth"));

// Higher-order function
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);

console.log("Original:", numbers);
console.log("Doubled:", doubled);
console.log("Evens:", evens);`,
                        language: "javascript",
                    },
                    {
                        id: "js-dom",
                        title: "DOM Manipulation",
                        content: `<h2>JavaScript DOM</h2>
<p>The <strong>Document Object Model (DOM)</strong> is a programming interface for HTML documents. JavaScript can access and modify all the elements of an HTML document.</p>
<h3>Finding Elements</h3>
<ul>
<li><code>document.getElementById(id)</code></li>
<li><code>document.getElementsByClassName(class)</code></li>
<li><code>document.querySelector(selector)</code></li>
<li><code>document.querySelectorAll(selector)</code></li>
</ul>
<h3>Changing Elements</h3>
<ul>
<li><code>element.innerHTML</code> — Change HTML content</li>
<li><code>element.style.property</code> — Change CSS</li>
<li><code>element.setAttribute(attr, value)</code></li>
<li><code>element.classList.add/remove/toggle</code></li>
</ul>`,
                        code: `// Select elements
const title = document.querySelector("h1");
const btn = document.getElementById("myBtn");
const items = document.querySelectorAll(".item");

// Change content
title.innerHTML = "DOM is Awesome! 🎯";
title.style.color = "#D4AF37";

// Add event listener
btn.addEventListener("click", () => {
  alert("Button clicked! 🚀");
  btn.style.backgroundColor = "#E44D26";
  btn.textContent = "Clicked!";
});

// Loop through elements
items.forEach((item, index) => {
  item.style.opacity = 1 - (index * 0.2);
  item.addEventListener("mouseenter", () => {
    item.style.transform = "scale(1.05)";
  });
  item.addEventListener("mouseleave", () => {
    item.style.transform = "scale(1)";
  });
});

// Create new element
const newDiv = document.createElement("div");
newDiv.textContent = "I was created by JS!";
newDiv.style.padding = "10px";
newDiv.style.background = "#264DE4";
newDiv.style.color = "white";
newDiv.style.borderRadius = "8px";
document.body.appendChild(newDiv);`,
                        language: "javascript",
                    },
                ],
            },
        ],
    },
    {
        id: "programming",
        title: "Programming Languages",
        topics: [
            {
                id: "python",
                title: "Python",
                icon: "🐍",
                color: "#3776AB",
                gradient: "linear-gradient(135deg, #3776AB, #FFD43B)",
                description: "A versatile, beginner-friendly language",
                lessons: [
                    {
                        id: "py-intro",
                        title: "Python Introduction",
                        content: `<h2>What is Python?</h2>
<p>Python is a popular programming language created by Guido van Rossum in 1991. It is used for web development, data science, AI, and more.</p>
<h3>Why Python?</h3>
<ul>
<li>Simple, readable syntax — beginner friendly</li>
<li>Works on all platforms (Windows, Mac, Linux)</li>
<li>Huge library ecosystem</li>
<li>Used in AI, ML, Data Science, Web Development</li>
<li>High demand in the job market</li>
</ul>`,
                        code: `# Hello World in Python
print("Hello, DataNauts! 🚀")

# Variables
name = "Jashwanth"
age = 20
college = "Sphoorthy Engineering College"
cgpa = 8.5

print(f"Name: {name}")
print(f"Age: {age}")
print(f"College: {college}")
print(f"CGPA: {cgpa}")

# Simple calculation
a = 10
b = 3
print(f"{a} + {b} = {a + b}")
print(f"{a} - {b} = {a - b}")
print(f"{a} * {b} = {a * b}")
print(f"{a} / {b} = {a / b:.2f}")`,
                        language: "python",
                    },
                    {
                        id: "py-control",
                        title: "Control Flow",
                        content: `<h2>Python Control Flow</h2>
<p>Control flow statements allow you to control the order in which your code is executed.</p>
<h3>Key Concepts</h3>
<ul>
<li><code>if / elif / else</code> — Conditional statements</li>
<li><code>for</code> loop — Iterate over a sequence</li>
<li><code>while</code> loop — Repeat while condition is true</li>
<li><code>break</code> — Exit the loop</li>
<li><code>continue</code> — Skip current iteration</li>
</ul>`,
                        code: `# If-Else
score = 85

if score >= 90:
    grade = "A+"
elif score >= 80:
    grade = "A"
elif score >= 70:
    grade = "B"
elif score >= 60:
    grade = "C"
else:
    grade = "F"

print(f"Score: {score}, Grade: {grade}")

# For Loop
print("\\n--- Counting ---")
for i in range(1, 6):
    print(f"Count: {i}")

# Loop through a list
languages = ["Python", "JavaScript", "Java", "C++"]
print("\\n--- Languages ---")
for lang in languages:
    print(f"🔹 {lang}")

# While Loop
print("\\n--- Countdown ---")
n = 5
while n > 0:
    print(f"{n}...")
    n -= 1
print("🚀 Launch!")

# List Comprehension
squares = [x**2 for x in range(1, 6)]
print(f"\\nSquares: {squares}")`,
                        language: "python",
                    },
                    {
                        id: "py-functions",
                        title: "Functions & Modules",
                        content: `<h2>Python Functions</h2>
<p>A function is a block of code that only runs when it is called. Functions help make code reusable and organized.</p>
<h3>Defining Functions</h3>
<ul>
<li>Use <code>def</code> keyword to define</li>
<li>Can accept parameters</li>
<li>Can return values using <code>return</code></li>
<li>Support default parameters and *args, **kwargs</li>
</ul>`,
                        code: `# Basic Function
def greet(name):
    return f"Hello, {name}! Welcome to DataNauts 👋"

print(greet("Student"))

# Function with default parameter
def power(base, exp=2):
    return base ** exp

print(f"2^3 = {power(2, 3)}")
print(f"5^2 = {power(5)}")

# Lambda function
square = lambda x: x ** 2
print(f"Square of 7: {square(7)}")

# Function with multiple returns
def get_stats(numbers):
    return min(numbers), max(numbers), sum(numbers) / len(numbers)

data = [23, 45, 67, 89, 12, 56]
minimum, maximum, average = get_stats(data)
print(f"\\nStats for {data}")
print(f"Min: {minimum}")
print(f"Max: {maximum}")
print(f"Average: {average:.1f}")

# Decorator
def timer(func):
    def wrapper(*args):
        print(f"Calling {func.__name__}...")
        result = func(*args)
        print(f"Done!")
        return result
    return wrapper

@timer
def calculate(n):
    return sum(range(n))

result = calculate(100)
print(f"Sum 1-99 = {result}")`,
                        language: "python",
                    },
                ],
            },
            {
                id: "java",
                title: "Java",
                icon: "☕",
                color: "#007396",
                gradient: "linear-gradient(135deg, #007396, #ED8B00)",
                description: "Enterprise-grade, object-oriented language",
                lessons: [
                    {
                        id: "java-intro",
                        title: "Java Introduction",
                        content: `<h2>What is Java?</h2>
<p>Java is a high-level, class-based, object-oriented programming language. It follows the "Write Once, Run Anywhere" (WORA) principle.</p>
<h3>Why Java?</h3>
<ul>
<li>Platform independent — runs on any OS with JVM</li>
<li>Object-Oriented Programming (OOP)</li>
<li>Used in Android development, enterprise apps, web services</li>
<li>Large community and library ecosystem</li>
<li>Strong type safety and exception handling</li>
</ul>`,
                        code: `public class HelloWorld {
    public static void main(String[] args) {
        // Print Hello World
        System.out.println("Hello, DataNauts! ☕");
        
        // Variables
        String name = "Jashwanth";
        int age = 20;
        double cgpa = 8.5;
        boolean isStudent = true;
        
        System.out.println("Name: " + name);
        System.out.println("Age: " + age);
        System.out.println("CGPA: " + cgpa);
        System.out.println("Student: " + isStudent);
        
        // Array
        String[] subjects = {"DSA", "DBMS", "OS", "Networks"};
        System.out.println("\\nSubjects:");
        for (String subject : subjects) {
            System.out.println("  📚 " + subject);
        }
        
        // Simple calculation
        int a = 15, b = 4;
        System.out.println("\\n" + a + " + " + b + " = " + (a + b));
        System.out.println(a + " % " + b + " = " + (a % b));
    }
}`,
                        language: "java",
                    },
                    {
                        id: "java-oop",
                        title: "OOP Concepts",
                        content: `<h2>Object-Oriented Programming</h2>
<p>Java is built around the concept of objects and classes. The four pillars of OOP are:</p>
<ul>
<li><strong>Encapsulation:</strong> Bundling data and methods together</li>
<li><strong>Inheritance:</strong> One class inherits from another</li>
<li><strong>Polymorphism:</strong> Many forms of a method</li>
<li><strong>Abstraction:</strong> Hiding complex implementation details</li>
</ul>`,
                        code: `// Class and Object
class Student {
    private String name;
    private String branch;
    private double cgpa;
    
    // Constructor
    public Student(String name, String branch, double cgpa) {
        this.name = name;
        this.branch = branch;
        this.cgpa = cgpa;
    }
    
    // Method
    public void display() {
        System.out.println("Name: " + name);
        System.out.println("Branch: " + branch);
        System.out.println("CGPA: " + cgpa);
        System.out.println("Grade: " + getGrade());
    }
    
    public String getGrade() {
        if (cgpa >= 9.0) return "A+";
        if (cgpa >= 8.0) return "A";
        if (cgpa >= 7.0) return "B";
        return "C";
    }
}

// Inheritance
class CSEStudent extends Student {
    private String[] skills;
    
    public CSEStudent(String name, double cgpa, String[] skills) {
        super(name, "CSE", cgpa);
        this.skills = skills;
    }
    
    public void showSkills() {
        display();
        System.out.println("Skills:");
        for (String skill : skills) {
            System.out.println("  💻 " + skill);
        }
    }
}

// Usage
public class Main {
    public static void main(String[] args) {
        String[] skills = {"Java", "Python", "React"};
        CSEStudent s = new CSEStudent("Jashwanth", 8.5, skills);
        s.showSkills();
    }
}`,
                        language: "java",
                    },
                ],
            },
            {
                id: "cpp",
                title: "C++",
                icon: "⚙️",
                color: "#00599C",
                gradient: "linear-gradient(135deg, #00599C, #004482)",
                description: "Powerful systems programming language",
                lessons: [
                    {
                        id: "cpp-intro",
                        title: "C++ Introduction",
                        content: `<h2>What is C++?</h2>
<p>C++ is a cross-platform language created by Bjarne Stroustrup as an extension of C. It's used for high-performance applications.</p>
<h3>Why C++?</h3>
<ul>
<li>Close to hardware — very fast execution</li>
<li>Used in game development, operating systems, browsers</li>
<li>Competitive programming favorite</li>
<li>Foundation for understanding computer science</li>
<li>Object-oriented and procedural</li>
</ul>`,
                        code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    // Output
    cout << "Hello, DataNauts! ⚙️" << endl;
    
    // Variables
    string name = "Jashwanth";
    int age = 20;
    double cgpa = 8.5;
    
    cout << "Name: " << name << endl;
    cout << "Age: " << age << endl;
    cout << "CGPA: " << cgpa << endl;
    
    // Array using vector
    vector<string> topics = {"Arrays", "Linked Lists", 
                             "Trees", "Graphs", "DP"};
    
    cout << endl << "DSA Topics:" << endl;
    for (int i = 0; i < topics.size(); i++) {
        cout << "  " << (i+1) << ". " << topics[i] << endl;
    }
    
    // Simple loop
    cout << endl << "Multiplication Table of 5:" << endl;
    for (int i = 1; i <= 10; i++) {
        cout << "  5 x " << i << " = " << (5 * i) << endl;
    }
    
    return 0;
}`,
                        language: "cpp",
                    },
                ],
            },
            {
                id: "c",
                title: "C",
                icon: "🔧",
                color: "#A8B9CC",
                gradient: "linear-gradient(135deg, #A8B9CC, #283593)",
                description: "The mother of all programming languages",
                lessons: [
                    {
                        id: "c-intro",
                        title: "C Introduction",
                        content: `<h2>What is C?</h2>
<p>C is a general-purpose programming language created by Dennis Ritchie in 1972. It is the foundation of many modern languages.</p>
<h3>Why Learn C?</h3>
<ul>
<li>Foundation of programming — builds strong basics</li>
<li>Understanding of memory management</li>
<li>Basis for C++, Java, and many other languages</li>
<li>Used in embedded systems, OS development</li>
<li>Essential for competitive programming</li>
</ul>`,
                        code: `#include <stdio.h>
#include <string.h>

int main() {
    // Output
    printf("Hello, DataNauts! 🔧\\n\\n");
    
    // Variables
    char name[] = "Jashwanth";
    int age = 20;
    float cgpa = 8.5;
    
    printf("Name: %s\\n", name);
    printf("Age: %d\\n", age);
    printf("CGPA: %.1f\\n\\n", cgpa);
    
    // Array
    int marks[] = {85, 90, 78, 92, 88};
    int n = 5;
    int sum = 0;
    
    printf("Subject Marks:\\n");
    for (int i = 0; i < n; i++) {
        printf("  Subject %d: %d\\n", i+1, marks[i]);
        sum += marks[i];
    }
    
    float avg = (float)sum / n;
    printf("\\nTotal: %d\\n", sum);
    printf("Average: %.2f\\n", avg);
    
    // Pointer basics
    int x = 42;
    int *ptr = &x;
    printf("\\nValue of x: %d\\n", x);
    printf("Address of x: %p\\n", (void*)ptr);
    printf("Value via pointer: %d\\n", *ptr);
    
    return 0;
}`,
                        language: "c",
                    },
                ],
            },
        ],
    },
    {
        id: "dsa",
        title: "Data Structures & Algorithms",
        topics: [
            {
                id: "dsa",
                title: "DSA",
                icon: "🧠",
                color: "#9B59B6",
                gradient: "linear-gradient(135deg, #9B59B6, #8E44AD)",
                description: "Master data structures & algorithms",
                lessons: [
                    {
                        id: "dsa-arrays",
                        title: "Arrays",
                        content: `<h2>Arrays</h2>
<p>An array is a data structure that can store a fixed-size collection of elements of the same data type.</p>
<h3>Key Operations</h3>
<ul>
<li><strong>Access:</strong> O(1) — Direct index access</li>
<li><strong>Search:</strong> O(n) — Linear search</li>
<li><strong>Insert:</strong> O(n) — Shifting elements</li>
<li><strong>Delete:</strong> O(n) — Shifting elements</li>
</ul>
<h3>Common Array Problems</h3>
<ul>
<li>Find the largest/smallest element</li>
<li>Reverse an array</li>
<li>Two Sum problem</li>
<li>Merge two sorted arrays</li>
</ul>`,
                        code: `// Array Operations in JavaScript

// Creating an array
const arr = [64, 34, 25, 12, 22, 11, 90];
console.log("Original:", arr);

// Find max and min
const max = Math.max(...arr);
const min = Math.min(...arr);
console.log("Max:", max, "Min:", min);

// Reverse array
const reversed = [...arr].reverse();
console.log("Reversed:", reversed);

// Two Sum Problem
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const nums = [2, 7, 11, 15];
const target = 9;
console.log(\`\\nTwo Sum(\${target}):\`, twoSum(nums, target));

// Bubble Sort
function bubbleSort(arr) {
  const n = arr.length;
  const a = [...arr];
  for (let i = 0; i < n-1; i++) {
    for (let j = 0; j < n-i-1; j++) {
      if (a[j] > a[j+1]) {
        [a[j], a[j+1]] = [a[j+1], a[j]];
      }
    }
  }
  return a;
}

console.log("Sorted:", bubbleSort(arr));`,
                        language: "javascript",
                    },
                    {
                        id: "dsa-linkedlist",
                        title: "Linked Lists",
                        content: `<h2>Linked Lists</h2>
<p>A linked list is a linear data structure where elements are stored in nodes, and each node points to the next node.</p>
<h3>Types of Linked Lists</h3>
<ul>
<li><strong>Singly Linked List:</strong> Each node points to the next</li>
<li><strong>Doubly Linked List:</strong> Each node points to next and previous</li>
<li><strong>Circular Linked List:</strong> Last node points to the first</li>
</ul>
<h3>Advantages</h3>
<ul>
<li>Dynamic size — can grow and shrink</li>
<li>Efficient insertions and deletions — O(1)</li>
<li>No memory waste</li>
</ul>`,
                        code: `// Singly Linked List Implementation

class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }

  // Add to end
  append(data) {
    const node = new Node(data);
    if (!this.head) {
      this.head = node;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = node;
    }
    this.size++;
  }

  // Add to beginning
  prepend(data) {
    const node = new Node(data);
    node.next = this.head;
    this.head = node;
    this.size++;
  }

  // Display
  display() {
    let current = this.head;
    let result = "";
    while (current) {
      result += current.data + " → ";
      current = current.next;
    }
    return result + "null";
  }

  // Reverse
  reverse() {
    let prev = null;
    let current = this.head;
    while (current) {
      let next = current.next;
      current.next = prev;
      prev = current;
      current = next;
    }
    this.head = prev;
  }
}

// Usage
const list = new LinkedList();
list.append(10);
list.append(20);
list.append(30);
list.prepend(5);

console.log("List:", list.display());
console.log("Size:", list.size);

list.reverse();
console.log("Reversed:", list.display());`,
                        language: "javascript",
                    },
                    {
                        id: "dsa-stacks-queues",
                        title: "Stacks & Queues",
                        content: `<h2>Stacks & Queues</h2>
<p><strong>Stack:</strong> LIFO (Last In, First Out) — Think of a stack of plates.</p>
<p><strong>Queue:</strong> FIFO (First In, First Out) — Think of a line at a ticket counter.</p>
<h3>Stack Operations</h3>
<ul>
<li><code>push()</code> — Add to top</li>
<li><code>pop()</code> — Remove from top</li>
<li><code>peek()</code> — View top element</li>
</ul>
<h3>Queue Operations</h3>
<ul>
<li><code>enqueue()</code> — Add to rear</li>
<li><code>dequeue()</code> — Remove from front</li>
<li><code>front()</code> — View front element</li>
</ul>`,
                        code: `// Stack Implementation
class Stack {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
}

// Usage
const stack = new Stack();
stack.push("🥞 Pancake 1");
stack.push("🥞 Pancake 2");
stack.push("🥞 Pancake 3");

console.log("Stack (top):", stack.peek());
console.log("Pop:", stack.pop());
console.log("Stack (top):", stack.peek());

// Queue Implementation
class Queue {
  constructor() { this.items = []; }
  enqueue(item) { this.items.push(item); }
  dequeue() { return this.items.shift(); }
  front() { return this.items[0]; }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
}

// Usage
const queue = new Queue();
queue.enqueue("🧑 Student 1");
queue.enqueue("🧑 Student 2");
queue.enqueue("🧑 Student 3");

console.log("\\nQueue (front):", queue.front());
console.log("Dequeue:", queue.dequeue());
console.log("Queue (front):", queue.front());
console.log("Queue size:", queue.size());`,
                        language: "javascript",
                    },
                ],
            },
        ],
    },
    {
        id: "database",
        title: "Databases",
        topics: [
            {
                id: "sql",
                title: "SQL",
                icon: "🗃️",
                color: "#336791",
                gradient: "linear-gradient(135deg, #336791, #4479A1)",
                description: "Structured Query Language for databases",
                lessons: [
                    {
                        id: "sql-intro",
                        title: "SQL Introduction",
                        content: `<h2>What is SQL?</h2>
<p>SQL (Structured Query Language) is used to communicate with databases. It is the standard language for relational database management systems.</p>
<h3>Key SQL Commands</h3>
<ul>
<li><strong>SELECT</strong> — Fetch data from a database</li>
<li><strong>INSERT</strong> — Insert new data</li>
<li><strong>UPDATE</strong> — Modify existing data</li>
<li><strong>DELETE</strong> — Remove data</li>
<li><strong>CREATE TABLE</strong> — Create a new table</li>
<li><strong>ALTER TABLE</strong> — Modify a table</li>
<li><strong>DROP TABLE</strong> — Delete a table</li>
</ul>`,
                        code: `-- Create a Students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    branch VARCHAR(50),
    year INT,
    cgpa DECIMAL(3,2),
    email VARCHAR(100) UNIQUE
);

-- Insert data
INSERT INTO students (name, branch, year, cgpa, email)
VALUES 
    ('Jashwanth', 'CSE', 3, 8.50, 'jash@sphoorthy.edu'),
    ('Priya', 'ECE', 2, 9.10, 'priya@sphoorthy.edu'),
    ('Rahul', 'CSE', 3, 7.80, 'rahul@sphoorthy.edu'),
    ('Sneha', 'IT', 4, 8.90, 'sneha@sphoorthy.edu');

-- Select all students
SELECT * FROM students;

-- Select with condition
SELECT name, cgpa FROM students 
WHERE branch = 'CSE' AND cgpa > 8.0;

-- Order by CGPA
SELECT name, branch, cgpa FROM students 
ORDER BY cgpa DESC;

-- Count students per branch
SELECT branch, COUNT(*) as count, AVG(cgpa) as avg_cgpa
FROM students 
GROUP BY branch;

-- Update a record
UPDATE students 
SET cgpa = 8.70 
WHERE name = 'Jashwanth';

-- Delete with condition
DELETE FROM students WHERE year = 4;`,
                        language: "sql",
                    },
                ],
            },
        ],
    },
    {
        id: "frameworks",
        title: "Frameworks & Tools",
        topics: [
            {
                id: "react",
                title: "React",
                icon: "⚛️",
                color: "#61DAFB",
                gradient: "linear-gradient(135deg, #61DAFB, #282C34)",
                description: "A JavaScript library for building UIs",
                lessons: [
                    {
                        id: "react-intro",
                        title: "React Introduction",
                        content: `<h2>What is React?</h2>
<p>React is a JavaScript library for building user interfaces, created by Facebook. It uses a component-based architecture.</p>
<h3>Key Concepts</h3>
<ul>
<li><strong>Components:</strong> Reusable UI building blocks</li>
<li><strong>JSX:</strong> JavaScript XML — write HTML in JS</li>
<li><strong>Props:</strong> Pass data between components</li>
<li><strong>State:</strong> Component's internal data</li>
<li><strong>Hooks:</strong> useState, useEffect, etc.</li>
<li><strong>Virtual DOM:</strong> Efficient rendering</li>
</ul>`,
                        code: `// React Component Example
import React, { useState, useEffect } from 'react';

// Functional Component with Hooks
function StudentCard({ name, branch, cgpa }) {
  const [liked, setLiked] = useState(false);
  
  const getGrade = (cgpa) => {
    if (cgpa >= 9.0) return '🌟 Outstanding';
    if (cgpa >= 8.0) return '⭐ Excellent';
    if (cgpa >= 7.0) return '✨ Good';
    return '📚 Keep Going';
  };

  return (
    <div className="student-card">
      <h3>{name}</h3>
      <p>Branch: {branch}</p>
      <p>CGPA: {cgpa} — {getGrade(cgpa)}</p>
      <button onClick={() => setLiked(!liked)}>
        {liked ? '❤️ Liked' : '🤍 Like'}
      </button>
    </div>
  );
}

// App Component
function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setStudents([
        { name: "Jashwanth", branch: "CSE", cgpa: 8.5 },
        { name: "Priya", branch: "ECE", cgpa: 9.1 },
        { name: "Rahul", branch: "CSE", cgpa: 7.8 },
      ]);
      setLoading(false);
    }, 1000);
  }, []);
  
  if (loading) return <p>Loading... ⏳</p>;
  
  return (
    <div>
      <h1>DataNauts Students</h1>
      {students.map((s, i) => (
        <StudentCard key={i} {...s} />
      ))}
    </div>
  );
}

export default App;`,
                        language: "javascript",
                    },
                ],
            },
            {
                id: "git",
                title: "Git & GitHub",
                icon: "📦",
                color: "#F05032",
                gradient: "linear-gradient(135deg, #F05032, #333)",
                description: "Version control and collaboration",
                lessons: [
                    {
                        id: "git-intro",
                        title: "Git Basics",
                        content: `<h2>What is Git?</h2>
<p>Git is a distributed version control system that tracks changes in your code. GitHub is a platform to host Git repositories online.</p>
<h3>Essential Git Commands</h3>
<ul>
<li><code>git init</code> — Initialize a new repository</li>
<li><code>git clone</code> — Clone a remote repository</li>
<li><code>git add</code> — Stage changes</li>
<li><code>git commit</code> — Save changes</li>
<li><code>git push</code> — Upload to remote</li>
<li><code>git pull</code> — Download updates</li>
<li><code>git branch</code> — Create/list branches</li>
<li><code>git merge</code> — Merge branches</li>
</ul>`,
                        code: `# Initialize a new repo
git init my-project
cd my-project

# Check status
git status

# Stage files
git add index.html        # Stage specific file
git add .                 # Stage all files

# Commit changes
git commit -m "Initial commit: Add homepage"

# Connect to GitHub
git remote add origin https://github.com/username/repo.git
git push -u origin main

# Create & switch branch
git branch feature-login
git checkout feature-login
# Or shorthand:
git checkout -b feature-login

# Make changes, then...
git add .
git commit -m "Add login page"

# Switch back and merge
git checkout main
git merge feature-login

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# View commit history
git log --oneline --graph

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Stash changes
git stash
git stash pop`,
                        language: "bash",
                    },
                ],
            },
        ],
    },
];

// Get all topics flattened
export function getAllTopics(): TutorialTopic[] {
    return tutorialCategories.flatMap(cat => cat.topics);
}

// Get a topic by ID
export function getTopicById(id: string): TutorialTopic | undefined {
    return getAllTopics().find(t => t.id === id);
}

// Get a lesson by topic and lesson ID
export function getLessonById(topicId: string, lessonId: string): TutorialLesson | undefined {
    const topic = getTopicById(topicId);
    return topic?.lessons.find(l => l.id === lessonId);
}
