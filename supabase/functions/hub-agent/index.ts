import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { message, context } = await req.json()

        let aiResponse = "";
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
            aiResponse = "Hey there! I'm your Event Hub Assistant. How can I help you today?";
        } else if (lowerMsg.includes("event") || lowerMsg.includes("happen")) {
            const { data: events } = await supabase.from('events').select('title').limit(3);
            const eventList = events?.map(e => e.title).join(", ") || "none found yet";
            aiResponse = `I found some upcoming events for you: ${eventList}. Would you like the details for any of these?`;
        } else if (lowerMsg.includes("internship")) {
            aiResponse = "I can definitely help with that. I've curated some AI and Fullstack roles specifically for you in the Internships tab!";
        } else if (lowerMsg.includes("cool") || lowerMsg.includes("good")) {
            aiResponse = "Heh, I try my best! I'm here to make your experience as smooth as possible. 🚀";
        } else {
            aiResponse = "That's interesting! Tell me more about it, or ask me about events, internships, or how to use the hub.";
        }

        return new Response(
            JSON.stringify({ response: aiResponse }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
