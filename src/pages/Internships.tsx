import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Briefcase,
    Building2,
    ExternalLink,
    User,
    Mail,
    Send,
    X,
    Sparkles,
    MessageSquare,
    ArrowRight,
    Bot
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Internship {
    id: string;
    title: string;
    company: string;
    description: string;
    image_url: string | null;
    internship_link: string;
}

const aiInternships: Internship[] = [
    { id: "1", title: "AI/ML Research Intern", company: "OpenAI", description: "Work on cutting-edge artificial intelligence research.", image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400", internship_link: "https://openai.com/careers/" },
    { id: "2", title: "Cloud Architecture Intern", company: "AWS", description: "Learn cloud computing at scale with services used by millions.", image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400", internship_link: "https://amazon.jobs/en/teams/aws" },
    { id: "3", title: "Cybersecurity Intern", company: "CrowdStrike", description: "Protect enterprises from cyber threats with next-gen security.", image_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400", internship_link: "https://careers.crowdstrike.com/" },
    { id: "4", title: "Data Science Intern", company: "Netflix", description: "Work on recommendation algorithms for 200M+ users.", image_url: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400", internship_link: "https://jobs.netflix.com/" },
    { id: "5", title: "DevOps Engineer Intern", company: "GitLab", description: "Work on CI/CD, containerization, and cloud-native tech.", image_url: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400", internship_link: "https://about.gitlab.com/careers/" },
    { id: "6", title: "Mobile App Intern", company: "Spotify", description: "Build features for the world's largest music streaming platform.", image_url: "https://images.unsplash.com/photo-1616348436918-d2273d9397a2?w=400", internship_link: "https://jobs.spotify.com/" },
    { id: "7", title: "Blockchain Developer", company: "Coinbase", description: "Build the future of finance with cryptocurrency and blockchain.", image_url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400", internship_link: "https://www.coinbase.com/careers" },
    { id: "8", title: "Robotics Intern", company: "Boston Dynamics", description: "Work on advanced robotics and locomotion technology.", image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400", internship_link: "https://bostondynamics.com/careers/" },
    { id: "9", title: "Quantum Computing", company: "IBM Research", description: "Work on quantum computing algorithms at the forefront of science.", image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400", internship_link: "https://careers.ibm.com/" },
    { id: "10", title: "AR/VR Development", company: "Meta", description: "Build the metaverse and create AR/VR experiences.", image_url: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400", internship_link: "https://metacareers.com/" },
    { id: "11", title: "Full Stack Developer", company: "Stripe", description: "Build financial infrastructure for the internet.", image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400", internship_link: "https://stripe.com/jobs" },
    { id: "12", title: "Game Development", company: "Unity", description: "Create tools for millions of developers worldwide.", image_url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400", internship_link: "https://careers.unity.com/" },
];

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

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
            content: `Hello! I'm your AI Internship Assistant.\n\nI can help you find:\n- Internships by role - "Show me AI jobs"\n- Internships by company - "OpenAI internships"\n- Skills needed - "what skills for ML"\n- Application tips - "how to apply"\n\nJust ask me anything!`,
            timestamp: new Date()
        }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const { toast } = useToast();

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

    const generateAIResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.match(/^(hi|hello|hey)/)) {
            return `Hey! I'm here to help you find the perfect internship.\n\nTry asking:\n- "Show me AI internships"\n- "What skills for data science?"\n- "How do I apply?"`;
        }

        if (lowerQuery.includes("ai") || lowerQuery.includes("ml") || lowerQuery.includes("machine learning")) {
            const aiJobs = aiInternships.filter(i => i.title.toLowerCase().includes("ai") || i.company === "OpenAI" || i.company === "IBM Research");
            return `AI/ML Internships:\n\n${aiJobs.map(i => `${i.title} at ${i.company}\n${i.description}`).join("\n\n")}\n\nTip: Focus on Python, TensorFlow/PyTorch!`;
        }

        if (lowerQuery.includes("data")) {
            const dataJobs = aiInternships.filter(i => i.title.toLowerCase().includes("data") || i.company === "Netflix");
            return `Data Science Internships:\n\n${dataJobs.map(i => `${i.title} at ${i.company}\n${i.description}`).join("\n\n")}\n\nKey skills: Python, SQL, Statistics`;
        }

        if (lowerQuery.includes("apply") || lowerQuery.includes("application")) {
            return `How to Apply:\n\n1. Find your fit - Browse internships above\n2. Prepare your profile - Resume + LinkedIn\n3. Click "Apply Now" on any listing\n4. Follow up after 1-2 weeks\n\nPro tip: Start applying 2-3 months early!`;
        }

        if (lowerQuery.includes("skill")) {
            return `Key Skills by Field:\n\nAI/ML: Python, TensorFlow, PyTorch\nData Science: Python, SQL, Statistics\nCloud: AWS, Docker, Kubernetes\nWeb Dev: React, Node.js, TypeScript\n\nWhich field interests you?`;
        }

        const featured = aiInternships[Math.floor(Math.random() * aiInternships.length)];
        return `Recommended: ${featured.title} at ${featured.company}\n\n${featured.description}\n\nWant more? Ask about specific fields like "AI jobs" or "cloud internships"`;
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
        }, 800);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    return (
        <div className="min-h-screen flex flex-col bg-[#030303]">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />
            </div>

            <Header />
            
            <main className="flex-1 pt-28 pb-16 relative z-10">
                <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
                    {/* Header */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Briefcase className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-sm font-medium text-emerald-400">Internships</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                            Hand-Picked Opportunities
                        </h1>
                        <p className="text-zinc-400 max-w-2xl text-base sm:text-lg">
                            Curated internship listings from top tech companies. Find your next career opportunity.
                        </p>
                    </motion.div>

                    {/* Search */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                                <Input
                                    placeholder="Search by title, company..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 h-12 bg-white/[0.03] border-white/[0.08] rounded-xl text-white placeholder:text-zinc-500 focus:border-white/[0.15]"
                                />
                            </div>
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="h-12 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-sm font-medium focus:outline-none focus:border-white/[0.15] cursor-pointer"
                            >
                                <option value="">All Companies</option>
                                {companies.map(company => (
                                    <option key={company} value={company}>{company}</option>
                                ))}
                            </select>
                            {(searchQuery || companyFilter) && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => { setSearchQuery(""); setCompanyFilter(""); }}
                                    className="h-12 rounded-xl border-white/[0.1] text-white hover:bg-white/[0.05]"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </motion.div>

                    {/* Results count */}
                    <p className="text-zinc-500 text-sm mb-6">
                        Showing {filteredInternships.length} internships
                    </p>

                    {/* Grid */}
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {filteredInternships.map((internship, index) => (
                            <motion.div
                                key={internship.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300"
                            >
                                {internship.image_url && (
                                    <div className="h-40 overflow-hidden">
                                        <img 
                                            src={internship.image_url} 
                                            alt={internship.title} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                        />
                                    </div>
                                )}
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {internship.company}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                                        {internship.title}
                                    </h3>
                                    <p className="text-sm text-zinc-500 line-clamp-2 mb-5">
                                        {internship.description}
                                    </p>
                                    <Button 
                                        className="w-full h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-medium group/btn"
                                        onClick={() => handleApplyClick(internship)}
                                    >
                                        Apply Now
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />

            {/* Chat Button */}
            <Button
                onClick={() => setShowChat(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-white text-black hover:bg-zinc-200 shadow-2xl z-50"
                size="icon"
            >
                <Bot className="w-6 h-6" />
            </Button>

            {/* Chat Modal */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 w-[380px] h-[520px] bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                        Online
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setShowChat(false)}
                                className="text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Quick Actions */}
                        <div className="px-4 py-3 border-b border-white/[0.06] flex gap-2 overflow-x-auto">
                            {["AI Jobs", "Data Science", "How to Apply"].map((tag) => (
                                <Button
                                    key={tag}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs whitespace-nowrap h-7 rounded-lg border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                                    onClick={() => setChatInput(tag)}
                                >
                                    {tag}
                                </Button>
                            ))}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                                >
                                    <div className={cn(
                                        "max-w-[85%] rounded-2xl px-4 py-3",
                                        msg.role === "user"
                                            ? "bg-white text-black"
                                            : "bg-white/[0.05] text-zinc-300"
                                    )}>
                                        <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/[0.05] rounded-2xl px-4 py-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                            <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/[0.06]">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ask about internships..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    disabled={isTyping}
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-white/[0.15]"
                                />
                                <Button 
                                    onClick={handleSendMessage} 
                                    disabled={isTyping || !chatInput.trim()} 
                                    size="icon"
                                    className="bg-white text-black hover:bg-zinc-200"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Application Modal */}
            <AnimatePresence>
                {showApplyModal && selectedInternship && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowApplyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-950 border border-white/[0.08] rounded-2xl max-w-md w-full p-6"
                        >
                            <h2 className="text-xl font-bold text-white mb-4">Apply to {selectedInternship.company}</h2>
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5">
                                <h3 className="font-semibold text-white">{selectedInternship.title}</h3>
                                <p className="text-sm text-zinc-500">{selectedInternship.company}</p>
                            </div>
                            {user ? (
                                <div className="space-y-2 mb-5 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                    <p className="text-sm text-zinc-400">Your profile will be shared:</p>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <User className="w-4 h-4 text-zinc-500" /> 
                                        {user.user_metadata?.full_name || "Name not set"}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <Mail className="w-4 h-4 text-zinc-500" /> 
                                        {user.email}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-5">
                                    <p className="text-sm text-blue-400">
                                        <Link to="/login" className="underline">Sign in</Link> to pre-fill your details
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 h-11 rounded-xl border-white/[0.1] text-white hover:bg-white/[0.05]" 
                                    onClick={() => setShowApplyModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    className="flex-1 h-11 rounded-xl bg-white text-black hover:bg-zinc-200" 
                                    onClick={() => { 
                                        window.open(generateApplicationLink(selectedInternship), "_blank"); 
                                        setShowApplyModal(false); 
                                        toast({ title: "Opening application page" }); 
                                    }}
                                >
                                    Continue
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
