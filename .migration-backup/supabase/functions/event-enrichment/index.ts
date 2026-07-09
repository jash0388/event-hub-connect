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

        // 1. Fetch events that haven't been enriched yet
        const { data: events, error: fetchError } = await supabase
            .from('events')
            .select('*')
            .is('category', null)
            .limit(5)

        if (fetchError) throw fetchError

        const results = []

        for (const event of (events || [])) {
            // AI Logic for Enrichment (Mocked for now)
            const description = event.description || ""
            let category = "General"
            let tags = []

            if (description.toLowerCase().includes("code") || description.toLowerCase().includes("tech")) {
                category = "Technology"
                tags = ["Coding", "Workshop"]
            } else if (description.toLowerCase().includes("music") || description.toLowerCase().includes("concert")) {
                category = "Entertainment"
                tags = ["Music", "Live"]
            } else if (description.toLowerCase().includes("sport")) {
                category = "Sports"
                tags = ["Competition", "Fitness"]
            }

            // Update the event with enriched data
            const { error: updateError } = await supabase
                .from('events')
                .update({
                    category,
                    // Assuming there's a tags or similar field, if not we just update category for now
                    trending_score: (event.trending_score || 0) + 5
                })
                .eq('id', event.id)

            if (!updateError) {
                results.push({ id: event.id, category })
            }
        }

        return new Response(
            JSON.stringify({ success: true, enriched: results }),
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
