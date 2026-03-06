import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Mail, User, MessageSquare, Loader2, MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const contactInfo = [
  { icon: Mail, label: "Email", value: "datanauts@sphn.edu.in", color: "blue" },
  { icon: MapPin, label: "Location", value: "Sphoorthy Engineering College", color: "violet" },
  { icon: Clock, label: "Response Time", value: "Within 24-48 hours", color: "emerald" },
];

const colorMap: Record<string, { icon: string; bg: string; border: string }> = {
  blue: { icon: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  violet: { icon: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ContactFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{
          name: result.data.name,
          email: result.data.email,
          subject: result.data.subject,
          message: result.data.message,
        }]);

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: "Thank you for reaching out. We'll get back to you soon.",
      });

      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error: any) {
      console.error("Contact form error:", error);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030303]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 -right-32 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[128px]" />
      </div>

      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 relative z-10">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-400">Get in Touch</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              Contact Us
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Have questions or want to collaborate? We'd love to hear from you.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1 space-y-4"
            >
              {contactInfo.map((item, idx) => {
                const colors = colorMap[item.color];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.03] hover:border-white/[0.1] transition-all"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", colors.bg, `border ${colors.border}`)}>
                      <item.icon className={cn("w-5 h-5", colors.icon)} />
                    </div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-white font-medium">{item.value}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Contact Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Send className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Send a Message</h2>
                    <p className="text-sm text-zinc-500">We'll respond as soon as possible</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-zinc-400 text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={handleChange}
                        className="h-12 bg-white/[0.03] border-white/[0.08] rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                        disabled={isSubmitting}
                      />
                      {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-zinc-400 text-sm flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="h-12 bg-white/[0.03] border-white/[0.08] rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                        disabled={isSubmitting}
                      />
                      {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-zinc-400 text-sm">
                      Subject
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      placeholder="What's this about?"
                      value={formData.subject}
                      onChange={handleChange}
                      className="h-12 bg-white/[0.03] border-white/[0.08] rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                      disabled={isSubmitting}
                    />
                    {errors.subject && <p className="text-rose-400 text-xs mt-1">{errors.subject}</p>}
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-zinc-400 text-sm">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us what's on your mind..."
                      value={formData.message}
                      onChange={handleChange}
                      className="min-h-[150px] bg-white/[0.03] border-white/[0.08] rounded-xl text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:bg-white/[0.05] transition-all resize-none"
                      disabled={isSubmitting}
                    />
                    {errors.message && <p className="text-rose-400 text-xs mt-1">{errors.message}</p>}
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-14 rounded-2xl font-semibold text-base bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
