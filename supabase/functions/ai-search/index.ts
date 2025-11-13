import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create authenticated Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, category, level } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch all notes
    const { data: notes, error: notesError } = await supabaseClient
      .from("notes")
      .select(`
        id,
        topic,
        subject,
        category,
        level,
        trust_score,
        file_type,
        tags,
        profiles!notes_uploader_id_fkey (
          full_name,
          reputation_level
        )
      `)
      .eq("status", "approved")
      .order("trust_score", { ascending: false })
      .limit(50);

    if (notesError) throw notesError;

    // Use AI to find relevant notes
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a helpful search assistant for an educational notes platform. Analyze the user's question and match it with the most relevant notes from the database. Return ONLY a JSON array of note IDs in order of relevance (most relevant first). Maximum 10 results. Format: ["id1","id2","id3"]`
          },
          {
            role: "user",
            content: `User question: "${query}"
            
Available notes: ${JSON.stringify(notes?.map(n => ({
              id: n.id,
              topic: n.topic,
              subject: n.subject,
              category: n.category,
              level: n.level,
              tags: n.tags
            })))}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse AI response
    let relevantIds: string[] = [];
    try {
      relevantIds = JSON.parse(aiContent);
    } catch {
      // Fallback to basic filtering if AI response is malformed
      relevantIds = notes?.filter(n => 
        n.topic.toLowerCase().includes(query.toLowerCase()) ||
        n.subject.toLowerCase().includes(query.toLowerCase())
      ).map(n => n.id) || [];
    }

    // Filter and order notes by AI relevance
    const relevantNotes = relevantIds
      .map(id => notes?.find(n => n.id === id))
      .filter(Boolean)
      .slice(0, 10);

    return new Response(JSON.stringify({ notes: relevantNotes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI search error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
