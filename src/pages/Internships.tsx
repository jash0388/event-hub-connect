import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Search,
    Briefcase,
    Building2,
    ExternalLink,
    Loader2,
    User,
    Mail,
    Send,
    Bot,
    X,
    Sparkles,
    GraduationCap,
    Calendar,
    DollarSign,
    Globe,
    ArrowRight,
    MessageSquare,
    Lightbulb,
    CheckCircle2,
    Clock,
    TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface Internship {
    id: string;
    title: string;
    company: string;
    description: string;
    image_url: string | null;
    internship_link: string;
}

// AI-curated internships - always available
const aiInternships: Internship[] = [
    { id: "1", title: "AI/ML Research Intern", company: "OpenAI", description: "Work on cutting-edge artificial intelligence research. Join the team pushing boundaries of AI.", image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400", internship_link: "https://openai.com/careers/internships/" },
    { id: "2", title: "Cloud Architecture Intern", company: "AWS", description: "Learn cloud computing at scale. Work on services used by millions worldwide.", image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400", internship_link: "https://amazon.jobs/en/teams/aws" },
    { id: "3", title: "Cybersecurity Intern", company: "CrowdStrike", description: "Work on next-gen endpoint security. Protect enterprises from cyber threats.", image_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400", internship_link: "https://careers.crowdstrike.com/" },
    { id: "4", title: "Data Science Intern", company: "Netflix", description: "Analyze massive datasets. Work on recommendation algorithms for 200M+ users.", image_url: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400", internship_link: "https://jobs.netflix.com/" },
    { id: "5", title: "DevOps Engineer Intern", company: "GitLab", description: "Work on DevOps platform. Learn CI/CD, containerization, cloud-native.", image_url: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400", internship_link: "https://about.gitlab.com/careers/" },
    { id: "6", title: "Mobile App Intern", company: "Spotify", description: "Build features for world's largest music streaming platform.", image_url: "https://images.unsplash.com/photo-1616348436918-d2273d9397a2?w=400", internship_link: "https://jobs.spotify.com/" },
    { id: "7", title: "Blockchain Developer", company: "Coinbase", description: "Work on cryptocurrency and blockchain. Build the future of finance.", image_url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400", internship_link: "https://www.coinbase.com/careers" },
    { id: "8", title: "Robotics Intern", company: "Boston Dynamics", description: "Work on advanced robotics and locomotion technology.", image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400", internship_link: "https://bostondynamics.com/careers/" },
    { id: "9", title: "Quantum Computing", company: "IBM Research", description: "Work on quantum computing algorithms. Be part of quantum revolution.", image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400", internship_link: "https://careers.ibm.com/" },
    { id: "10", title: "AR/VR Development", company: "Meta", description: "Build the metaverse. Work on AR/VR experiences for billions.", image_url: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400", internship_link: "https://metacareers.com/" },
    { id: "11", title: "Full Stack Developer", company: "Stripe", description: "Build financial infrastructure for internet. Work on payments used by millions.", image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400", internship_link: "https://stripe.com/jobs" },
    { id: "12", title: "Game Development", company: "Unity", description: "Work on world's leading game engine. Create tools for millions of developers.", image_url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400", internship_link: "https://careers.unity.com/" },
];

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

// Comprehensive internship data for AI responses
const internshipCategories = {
    ai: ["OpenAI", "IBM Research", "Meta"],
    data: ["Netflix", "Spotify", "Stripe"],
    cloud: ["AWS", "GitLab"],
    security: ["CrowdStrike"],
    web3: ["Coinbase"],
    robotics: ["Boston Dynamics"],
    arvr: ["Meta"],
    gaming: ["Unity"],
    mobile: ["Spotify"],
    finance: ["Stripe", "Coinbase", "Netflix"]
};

const skillsByCategory: Record<string, string[]> = {
    "AI/ML": ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "NLP"],
    "Data Science": ["Python", "SQL", "Machine Learning", "Statistics", "Tableau"],
    "Cloud": ["AWS", "Docker", "Kubernetes", "Terraform", "Linux"],
    "Cybersecurity": ["Network Security", "Penetration Testing", "SIEM", "Python"],
    "Blockchain": ["Solidity", "Web3", "Ethereum", "Cryptography"],
    "Mobile": ["React Native", "Swift", "Kotlin", "iOS", "Android"],
    "Game Dev": ["Unity", "C#", "Unreal", "3D Graphics"],
    "Full Stack": ["React", "Node.js", "TypeScript", "PostgreSQL", "GraphQL"]
};

export default function Internships() {
    const [searchQuery, setSearchQuery] = useState("");
    const [companyFilter, setCompanyFilter] = useState("");
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            role: "assistant",
            content: `👋 Hello! I'm your **AI Internship Assistant**!

I can help you find:
• **Internships by role** - "Show me AI jobs" or "data science internships"
• **Internships by company** - "OpenAI internships" or "what does Meta offer"
• **Skills needed** - "what skills do I need for ML"
• **Application tips** - "how to apply" or "application tips"
• **Career guidance** - "what career path should I choose"

Just ask me anything about internships!`,
            timestamp: new Date()
        }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const { toast } = useToast();

    // Filter internships
    const filteredInternships = aiInternships.filter(internship => {
        const matchesSearch = !searchQuery ||
            internship.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            internship.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            internship.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCompany = !companyFilter || internship.company === companyFilter;

        return matchesSearch && matchesCompany;
    });

    const companies = [...new Set(aiInternships.map(i => i.company))];

    const handleApplyClick = (internship: Internship) => {
        setSelectedInternship(internship);
        setShowApplyModal(true);
    };

    const generateApplicationLink = (internship: Internship) => {
        if (!internship.internship_link) return "#";

        if (user) {
            const params = new URLSearchParams();
            params.set("name", user.user_metadata?.full_name || "");
            params.set("email", user.email || "");
            const separator = internship.internship_link.includes("?") ? "&" : "?";
            return `${internship.internship_link}${separator}${params.toString()}`;
        }
        return internship.internship_link;
    };

    // Enhanced AI response generation
    const generateAIResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();

        // Welcome/greeting
        if (lowerQuery.match(/^(hi|hello|hey|hiya|sup|yo)/)) {
            return `Hey there! 🎉 I'm here to help you find the perfect internship! 

Try asking me things like:
• "Show me AI internships"
• "What skills do I need for data science?"
• "Which companies pay well?"
• "How do I apply?"

What would you like to know?`;
        }

        // Help request
        if (lowerQuery.includes("help") || lowerQuery === "?" || lowerQuery === "help") {
            return `I'm here to help! Here's what I can do:

🔍 **Find internships** by:
  - Role: "AI jobs", "data science internships"
  - Company: "OpenAI", "Stripe", "Netflix"
  - Skills: "Python jobs", "React positions"

📚 **Career guidance**:
  - "What skills do I need for ML?"
  - "Which path should I choose?"

📝 **Application help**:
  - "How to apply"
  - "Application tips"
  - "Resume advice"

💰 **Compensation**:
  - "Which companies pay well?"
  - "Salary expectations"

Just type your question!`;
        }

        // Skills queries
        if (lowerQuery.includes("skill") || lowerQuery.includes("learn") || lowerQuery.includes("know")) {
            let category = "";

            if (lowerQuery.includes("ai") || lowerQuery.includes("ml") || lowerQuery.includes("machine learning")) {
                category = "AI/ML";
            } else if (lowerQuery.includes("data") || lowerQuery.includes("analytics")) {
                category = "Data Science";
            } else if (lowerQuery.includes("cloud") || lowerQuery.includes("aws")) {
                category = "Cloud";
            } else if (lowerQuery.includes("cyber") || lowerQuery.includes("security")) {
                category = "Cybersecurity";
            } else if (lowerQuery.includes("blockchain") || lowerQuery.includes("crypto")) {
                category = "Blockchain";
            } else if (lowerQuery.includes("mobile") || lowerQuery.includes("app")) {
                category = "Mobile";
            } else if (lowerQuery.includes("game")) {
                category = "Game Dev";
            } else if (lowerQuery.includes("web") || lowerQuery.includes("full stack") || lowerQuery.includes("developer")) {
                category = "Full Stack";
            }

            if (category && skillsByCategory[category]) {
                return `For **${category}** roles, you should focus on:\n\n${skillsByCategory[category].map(s => `• ${s}`).join("\n")}\n\n💡 Start learning these and you'll be ready for internships!`;
            }

            return `Here are key skills for different internship paths:\n\n${Object.entries(skillsByCategory).map(([cat, skills]) =>
                `**${cat}**: ${skills.slice(0, 3).join(", ")}`
            ).join("\n\n")}\n\nWhich area interests you most?`;
        }

        // Salary/compensation
        if (lowerQuery.includes("salary") || lowerQuery.includes("pay") || lowerQuery.includes("stipend") || lowerQuery.includes("compensation") || lowerQuery.includes("how much")) {
            return `💰 **Top Paying Internships** (typically $8,000-15,000/month):\n\n`;
        }

        // Remote work
        if (lowerQuery.includes("remote") || lowerQuery.includes("work from home") || lowerQuery.includes("wfh") || lowerQuery.includes("hybrid")) {
            return `🏠 **Remote Work Options**:\n\nMost tech companies offer flexible arrangements:\n\n${aiInternships.slice(0, 5).map(i => `• ${i.company}`).join("\n")}\n\nCheck individual postings for specific remote/hybrid policies. Many top companies like GitLab and Coinbase are fully remote-friendly!\n\n🌍 You can also ask about specific companies!`;
        }

        // How to apply
        if (lowerQuery.includes("apply") || lowerQuery.includes("application") || lowerQuery.includes("how to")) {
            return `📝 **How to Apply for Internships**:\n\n**Step-by-Step Guide:**\n\n1️⃣ **Find your fit** - Browse internships here or ask me!\n\n2️⃣ **Prepare your profile**:\n   • Update your resume\n   • LinkedIn profile ready\n   • Portfolio/GitHub (for dev roles)\n\n3️⃣ **Apply**:\n   • Click "Apply Now" on any listing\n   • Login to auto-fill your details\n   • Fill company-specific forms\n\n4️⃣ **Follow up**:\n   • Apply 2-3 months before\n   • Check application status weekly\n   • Network on LinkedIn\n\n💡 **Pro tip**: Start applying early - most deadlines are 2-3 months before!`;
        }

        // Application tips
        if (lowerQuery.includes("tip") || lowerQuery.includes("advice") || lowerQuery.includes("recommend")) {
            return `💡 **Internship Application Tips**:\n\n**Before Applying:**\n• Start 2-3 months early\n• Build relevant projects\n• Update your LinkedIn\n\n**Your Application:**\n• Customize your resume\n• Write a compelling cover letter\n• Highlight relevant projects\n\n**After Applying:**\n• Follow up after 1-2 weeks\n• Connect with employees on LinkedIn\n• Apply to multiple positions\n\n**Interview Prep:**\n• Practice coding problems\n• Know the company products\n• Prepare questions to ask\n\nNeed help with any specific step?`;
        }

        // Career guidance
        if (lowerQuery.includes("career") || lowerQuery.includes("path") || lowerQuery.includes("choose") || lowerQuery.includes("which") || lowerQuery.includes("should i")) {
            return `🧭 **Career Path Guidance**:\n\nHere are hot internship paths:\n\n🚀 **AI/ML** - Highest demand, cutting-edge work\n\n💳 **FinTech** - Great pay, stable industry\n\n☁️ **Cloud/DevOps** - Always in demand\n\n🔒 **Cybersecurity** - Critical, high salaries\n\n🎮 **Gaming** - Fun, creative\n\n🌐 **Web3/Blockchain** - Emerging, high risk/reward\n\n**To help you choose, tell me:**\n• Do you prefer coding or more creative work?\n• What programming languages do you know?\n• What matters most: pay,兴趣, or job security?\n\nI can recommend specific internships based on your interests!`;
        }

        // List all internships
        if (lowerQuery.includes("list") || lowerQuery.includes("all") || lowerQuery.includes("show me") || lowerQuery === "internships" || lowerQuery === "jobs") {
            const allInternships = aiInternships.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n🔗 [Apply Now](${i.internship_link})`
            ).join("\n\n---\n\n");

            return `📋 **All Available Internships** (${aiInternships.length} positions):\n\n${allInternships}\n\n💡 Want more details? Ask about a specific company or role!`;
        }

        // Company-specific queries
        for (const company of companies) {
            if (lowerQuery.includes(company.toLowerCase())) {
                const companyInternships = aiInternships.filter(i => i.company === company);
                return `🏢 **${company}** Internships:\n\n${companyInternships.map(i =>
                    `**${i.title}**\n${i.description}\n\n💰 Apply: [${i.internship_link}](${i.internship_link})`
                ).join("\n\n---\n\n")}`;
            }
        }

        // Category-specific queries
        if (lowerQuery.includes("ai") || lowerQuery.includes("machine learning") || lowerQuery.includes("ml") || lowerQuery.includes("deep learning")) {
            const aiJobs = aiInternships.filter(i =>
                i.title.toLowerCase().includes("ai") ||
                i.title.toLowerCase().includes("ml") ||
                i.title.toLowerCase().includes("quantum") ||
                i.company === "OpenAI" ||
                i.company === "IBM Research"
            );
            return `🤖 **AI/ML Internships**:\n\n${aiJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Tip: Focus on Python, TensorFlow/PyTorch, and build ML projects!*`;
        }

        if (lowerQuery.includes("data") || lowerQuery.includes("analytics") || lowerQuery.includes("science")) {
            const dataJobs = aiInternships.filter(i =>
                i.title.toLowerCase().includes("data") ||
                i.company === "Netflix" ||
                i.company === "Spotify"
            );
            return `📊 **Data Science Internships**:\n\n${dataJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Key skills: Python, SQL, Machine Learning, Statistics*`;
        }

        if (lowerQuery.includes("software") || lowerQuery.includes("developer") || lowerQuery.includes("engineer") || lowerQuery.includes("programming") || lowerQuery.includes("coding")) {
            const devJobs = aiInternships.filter(i =>
                i.title.toLowerCase().includes("developer") ||
                i.title.toLowerCase().includes("engineer") ||
                i.title.toLowerCase().includes("full stack") ||
                i.title.toLowerCase().includes("mobile") ||
                i.title.toLowerCase().includes("game")
            );
            return `💻 **Software Development Internships**:\n\n${devJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Tip: Have projects on GitHub and be ready for coding interviews!*`;
        }

        if (lowerQuery.includes("cyber") || lowerQuery.includes("security")) {
            const securityJobs = aiInternships.filter(i =>
                i.title.toLowerCase().includes("security") ||
                i.company === "CrowdStrike"
            );
            return `🔒 **Cybersecurity Internships**:\n\n${securityJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Get certified: CompTIA Security+, CEH, or work on CTF projects!*`;
        }

        if (lowerQuery.includes("cloud") || lowerQuery.includes("devops") || lowerQuery.includes("aws")) {
            const cloudJobs = aiInternships.filter(i =>
                i.title.toLowerCase().includes("cloud") ||
                i.title.toLowerCase().includes("devops") ||
                i.company === "AWS" ||
                i.company === "GitLab"
            );
            return `☁️ **Cloud/DevOps Internships**:\n\n${cloudJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Learn: Docker, Kubernetes, AWS, CI/CD pipelines!*`;
        }

        if (lowerQuery.includes("blockchain") || lowerQuery.includes("crypto") || lowerQuery.includes("web3")) {
            const blockchainJobs = aiInternships.filter(i =>
                i.company === "Coinbase"
            );
            return `🔗 **Blockchain/Crypto Internships**:\n\n${blockchainJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Learn: Solidity, Ethereum, Web3.js, DeFi concepts!*`;
        }

        if (lowerQuery.includes("game") || lowerQuery.includes("gaming") || lowerQuery.includes("unity")) {
            const gameJobs = aiInternships.filter(i =>
                i.company === "Unity"
            );
            return `🎮 **Game Development Internships**:\n\n${gameJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Build a game portfolio with Unity and show it on Itch.io!*`;
        }

        if (lowerQuery.includes("ar") || lowerQuery.includes("vr") || lowerQuery.includes("metaverse") || lowerQuery.includes("virtual reality")) {
            const arvrJobs = aiInternships.filter(i =>
                i.title.toLowerCase().includes("ar") ||
                i.title.toLowerCase().includes("vr") ||
                i.company === "Meta"
            );
            return `🥽 **AR/VR Internships**:\n\n${arvrJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Learn: Unity, Unreal, C#, 3D modeling!*`;
        }

        if (lowerQuery.includes("mobile") || lowerQuery.includes("ios") || lowerQuery.includes("android") || lowerQuery.includes("app")) {
            const mobileJobs = aiInternships.filter(i =>
                i.title.toLowerCase().includes("mobile") ||
                i.company === "Spotify"
            );
            return `📱 **Mobile Development Internships**:\n\n${mobileJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Learn: React Native, Swift (iOS), Kotlin (Android)*`;
        }

        if (lowerQuery.includes("finance") || lowerQuery.includes("financial") || lowerQuery.includes("fintech") || lowerQuery.includes("payment")) {
            const financeJobs = aiInternships.filter(i =>
                i.company === "Stripe" ||
                i.company === "Coinbase"
            );
            return `💳 **FinTech Internships**:\n\n${financeJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Know: APIs, Payment systems, Security, React/Node.js*`;
        }

        if (lowerQuery.includes("robot")) {
            const roboticsJobs = aiInternships.filter(i =>
                i.company === "Boston Dynamics"
            );
            return `🤖 **Robotics Internships**:\n\n${roboticsJobs.map(i =>
                `**${i.title}** at ${i.company}\n${i.description}\n\n🔗 [Apply](${i.internship_link})`
            ).join("\n\n---\n\n")}\n\n💡 *Focus on: C++, ROS, control systems, mechanical engineering*`;
        }

        // User wants internship recommendations
        if (lowerQuery.includes("give") || lowerQuery.includes("any") || lowerQuery.includes("one") || lowerQuery.includes("recommend") || lowerQuery.includes("best") || lowerQuery.includes("top") || lowerQuery.includes("suggest") || lowerQuery.includes("find me") || lowerQuery === " internship" || lowerQuery.includes("looking for") || lowerQuery.includes("need ") && lowerQuery.includes("internship")) {
            const featured = aiInternships[Math.floor(Math.random() * aiInternships.length)];
            return `🌟 **Recommended Internship For You**:

**${featured.title}** at ${featured.company}

📝 ${featured.description}

💰 **Apply Now**: ${featured.internship_link}

💡 *Want more options? Ask me to show "all internships" or specify a field like "AI jobs"*`;
        }

        // Fallback response
        return `I found ${aiInternships.length} amazing internships from top companies!\n\n**Just ask me like this:**\n• "Give me an internship"  \n• "Show me AI jobs"\n• "What skills for data science?"\n• "How to apply"\n• "OpenAI internships"\n\nOr browse all listings above! 🔍`;
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isTyping) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: chatInput.trim(),
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatInput("");
        setIsTyping(true);

        // Simulate AI thinking delay
        setTimeout(() => {
            const response = generateAIResponse(userMessage.content);
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response,
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, assistantMessage]);
            setIsTyping(false);
        }, 1000);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    return (
        <div className="min-h-screen flex flex-col" style={{
            background: 'linear-gradient(to bottom, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)'
        }}>
            <Header />
            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Hero */}
                    <div className="bg-white/85 backdrop-blur-sm rounded-xl p-8 mb-12 shadow-sm border border-gray-100">
                        <h1 className="text-4xl font-display font-bold text-[#111827] mb-4 text-center">
                            Hand Picked Internships
                            <span className="block w-24 h-1 bg-[#22C55E] mx-auto mt-3 rounded-full"></span>
                        </h1>
                        <p className="text-[#4B5563] max-w-2xl mx-auto text-center">
                            Hand-picked internship opportunities from top tech companies.
                            Carefully curated to match your career goals.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 mb-8 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search by title, company, or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11 rounded-full border-gray-200 focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
                                />
                            </div>
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-[#4B5563] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
                            >
                                <option value="">All Companies</option>
                                {companies.map(company => (
                                    <option key={company} value={company}>{company}</option>
                                ))}
                            </select>
                            {(searchQuery || companyFilter) && (
                                <Button variant="outline" onClick={() => { setSearchQuery(""); setCompanyFilter(""); }} className="rounded-full border-gray-200 text-[#4B5563] hover:bg-gray-50">
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="mb-6">
                        <p className="text-[#4B5563]">
                            Showing {filteredInternships.length} AI-curated internships
                        </p>
                    </div>

                    {/* Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredInternships.map((internship) => (
                            <li key={internship.id} className="list-none">
                                <div className="relative h-full rounded-[24px] border-[0.75px] border-gray-200 p-2">
                                    <GlowingEffect
                                        spread={40}
                                        glow={true}
                                        disabled={false}
                                        proximity={64}
                                        inactiveZone={0.01}
                                        borderWidth={2}
                                    />
                                    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-white/95 p-6 shadow-lg">
                                        {internship.image_url && (
                                            <div className="h-48 overflow-hidden rounded-xl -mx-6 -mt-6 mb-4">
                                                <img src={internship.image_url} alt={internship.title} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge variant="secondary" className="flex items-center gap-1 bg-[#22C55E]/10 text-[#22C55E] border-none">
                                                    <Building2 className="w-3 h-3" />
                                                    {internship.company}
                                                </Badge>
                                            </div>
                                            <h3 className="text-xl font-bold mb-2 text-[#111827]">{internship.title}</h3>
                                            <p className="text-[#4B5563] text-sm mb-4 line-clamp-3">{internship.description}</p>
                                        </div>
                                        <Button className="w-full rounded-full bg-[#22C55E] hover:bg-[#16A34A]" onClick={() => handleApplyClick(internship)}>
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Apply Now
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />

            {/* Chat Button */}
            <Button
                onClick={() => setShowChat(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50"
                size="icon"
            >
                <MessageSquare className="w-6 h-6" />
            </Button>

            {/* Chat Modal */}
            {showChat && (
                <div className="fixed bottom-24 right-6 w-[380px] h-[550px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Internship AI Assistant</h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Online • Ready to help
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 border-b border-border bg-muted/30 flex gap-2 overflow-x-auto">
                        {["AI Jobs", "Data Science", "How to Apply", "Skills"].map((tag) => (
                            <Button
                                key={tag}
                                variant="outline"
                                size="sm"
                                className="text-xs whitespace-nowrap h-7"
                                onClick={() => {
                                    setChatInput(tag);
                                }}
                            >
                                {tag}
                            </Button>
                        ))}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20">
                        {chatMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl px-4 py-3">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-border bg-card">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask me about internships..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                disabled={isTyping}
                                className="bg-muted/50"
                            />
                            <Button onClick={handleSendMessage} disabled={isTyping || !chatInput.trim()} size="icon">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Application Modal */}
            {showApplyModal && selectedInternship && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Application Details</h2>
                        <div className="bg-muted/50 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold">{selectedInternship.title}</h3>
                            <p className="text-sm text-muted-foreground">{selectedInternship.company}</p>
                        </div>
                        {user ? (
                            <div className="space-y-2 mb-4">
                                <p className="text-sm text-muted-foreground">Your profile will be shared:</p>
                                <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4" /> {user.user_metadata?.full_name}</div>
                                <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4" /> {user.email}</div>
                            </div>
                        ) : (
                            <div className="bg-primary/10 p-4 rounded-lg mb-4">
                                <p className="text-sm text-primary"><Link to="/login" className="underline">Login</Link> to pre-fill your details</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setShowApplyModal(false)}>Cancel</Button>
                            <Button className="flex-1" onClick={() => { window.open(generateApplicationLink(selectedInternship), "_blank"); setShowApplyModal(false); toast({ title: "Opening Application" }); }}>
                                Continue to Apply
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
