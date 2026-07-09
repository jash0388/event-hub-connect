import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// AI-curated internship listings based on trending tech roles
const aiCuratedInternships = [
    {
        title: "AI/ML Research Intern",
        company: "OpenAI",
        description: "Work on cutting-edge artificial intelligence research. Join the team that's pushing the boundaries of AI capabilities.",
        image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
        internship_link: "https://openai.com/careers/internships/",
        category: "AI/ML",
        location: "San Francisco, CA",
        is_remote: false,
    },
    {
        title: "Cloud Architecture Intern",
        company: "AWS",
        description: "Learn cloud computing at scale. Work on services used by millions of developers worldwide.",
        image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400",
        internship_link: "https://amazon.jobs/en/teams/aws",
        category: "Cloud",
        location: "Seattle, WA",
        is_remote: false,
    },
    {
        title: "Cybersecurity Intern",
        company: "CrowdStrike",
        description: "Protect enterprises from cyber threats. Work on next-generation endpoint security solutions.",
        image_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400",
        internship_link: "https://careers.crowdstrike.com/",
        category: "Security",
        location: "Austin, TX",
        is_remote: false,
    },
    {
        title: "Data Science Intern",
        company: "Netflix",
        description: "Analyze massive datasets to improve user experience. Work on recommendation algorithms used by 200M+ users.",
        image_url: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400",
        internship_link: "https://jobs.netflix.com/",
        category: "Data Science",
        location: "Los Angeles, CA",
        is_remote: false,
    },
    {
        title: "DevOps Engineer Intern",
        company: "GitLab",
        description: "Work on the DevOps platform used by millions. Learn CI/CD, containerization, and cloud-native technologies.",
        image_url: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400",
        internship_link: "https://about.gitlab.com/careers/",
        category: "DevOps",
        location: "Remote",
        is_remote: true,
    },
    {
        title: "Mobile App Development Intern",
        company: "Spotify",
        description: "Build features for the world's largest music streaming platform. iOS/Android development opportunities.",
        image_url: "https://images.unsplash.com/photo-1616348436918-d2273d9397a2?w=400",
        internship_link: "https://jobs.spotify.com/",
        category: "Mobile",
        location: "Stockholm, Sweden",
        is_remote: false,
    },
    {
        title: "Blockchain Developer Intern",
        company: "Coinbase",
        description: "Work on cryptocurrency and blockchain technology. Build the future of finance.",
        image_url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400",
        internship_link: "https://www.coinbase.com/careers",
        category: "Blockchain",
        location: "Remote",
        is_remote: true,
    },
    {
        title: "Robotics Intern",
        company: "Boston Dynamics",
        description: "Work on advanced robotics and locomotion. Help shape the future of robotic technology.",
        image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400",
        internship_link: "https://bostondynamics.com/careers/",
        category: "Robotics",
        location: "Waltham, MA",
        is_remote: false,
    },
    {
        title: "Quantum Computing Intern",
        company: "IBM Research",
        description: "Work on quantum computing algorithms and hardware. Be part of the quantum revolution.",
        image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400",
        internship_link: "https://careers.ibm.com/",
        category: "Quantum",
        location: "Yorktown Heights, NY",
        is_remote: false,
    },
    {
        title: "AR/VR Development Intern",
        company: "Meta",
        description: "Build the metaverse. Work on AR/VR experiences used by billions.",
        image_url: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400",
        internship_link: "https://metacareers.com/",
        category: "AR/VR",
        location: "Menlo Park, CA",
        is_remote: false,
    },
    {
        title: "Full Stack Developer Intern",
        company: "Stripe",
        description: "Build financial infrastructure for the internet. Work on payments systems used by millions of businesses.",
        image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
        internship_link: "https://stripe.com/jobs",
        category: "Full Stack",
        location: "San Francisco, CA",
        is_remote: false,
    },
    {
        title: "Game Development Intern",
        company: "Unity",
        description: "Work on the world's leading game engine. Create tools used by millions of game developers.",
        image_url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400",
        internship_link: "https://careers.unity.com/",
        category: "Gaming",
        location: "San Francisco, CA",
        is_remote: false,
    },
];

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const internships: any[] = [];

        // 1. Try fetching from Remotive API
        try {
            const remotiveResponse = await fetch(
                "https://remotive.com/api/remote-jobs?category=software-dev-jobs&limit=20"
            );
            const remotiveData = await remotiveResponse.json();

            if (remotiveData.jobs) {
                for (const job of remotiveData.jobs.slice(0, 5)) {
                    internships.push({
                        title: job.title,
                        company: job.company_name,
                        description: job.description?.substring(0, 500) || "Remote internship opportunity",
                        image_url: null,
                        internship_link: job.url,
                        category: "Remote",
                        is_remote: true,
                        source: "remotive",
                    });
                }
            }
        } catch (e) {
            console.log("Remotive API error:", e);
        }

        // 2. Add AI-curated internships
        for (const internship of aiCuratedInternships) {
            internships.push({
                title: internship.title,
                company: internship.company,
                description: internship.description,
                image_url: internship.image_url,
                internship_link: internship.internship_link,
                category: internship.category,
                is_remote: internship.is_remote,
                source: "ai_curated",
            });
        }

        // 3. Insert/update into database
        let insertedCount = 0;
        for (const internship of internships) {
            const { error } = await supabase
                .from("internships")
                .upsert(
                    {
                        title: internship.title,
                        company: internship.company,
                        description: internship.description,
                        image_url: internship.image_url,
                        internship_link: internship.internship_link,
                    },
                    { onConflict: "title,company" }
                );

            if (!error) {
                insertedCount++;
            }
        }

        // 4. Log the sync for tracking
        await supabase.from("sync_logs").insert({
            source: "auto_sync",
            count: insertedCount,
            status: "success",
        });

        return new Response(
            JSON.stringify({
                success: true,
                count: insertedCount,
                message: `Auto-sync complete! Added ${insertedCount} internships (${aiCuratedInternships.length} AI-curated + remote listings)`,
                sources: {
                    remote_api: internships.filter(i => i.source === "remotive").length,
                    ai_curated: internships.filter(i => i.source === "ai_curated").length,
                },
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: String(error) }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
