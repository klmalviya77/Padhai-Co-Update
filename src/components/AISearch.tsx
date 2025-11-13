import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  topic: string;
  subject: string;
  category: string;
  level: string;
  trust_score: number;
  profiles: {
    full_name: string;
    reputation_level: string;
  };
}

export const AISearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to use AI search");
      return;
    }

    setSearching(true);
    setResults([]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.notes || []);
      
      if (data.notes.length === 0) {
        toast.info("No results found. Try different keywords.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question like 'How to solve quadratic equations?'"
              className="flex-1"
              disabled={searching}
            />
            <Button type="submit" disabled={searching}>
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results ({results.length})</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((note) => (
              <Card
                key={note.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/notes/${note.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">
                    {note.topic}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap pt-2">
                    <Badge variant="secondary">
                      {note.category === "programming" ? note.level :
                       note.category === "school" ? `Class ${note.level}` :
                       `Semester ${note.level}`}
                    </Badge>
                    <Badge variant="outline">{note.subject}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">By {note.profiles.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trust Score:</span>
                      <span className="font-semibold text-success">{note.trust_score}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
