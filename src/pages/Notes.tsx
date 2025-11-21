import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { FileText, ThumbsUp, Award, Loader2, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Note {
  id: string;
  category: string;
  level: string;
  subject: string;
  topic: string;
  upvotes: number;
  trust_score: number;
  created_at: string;
  profiles: {
    full_name: string;
    reputation_level: string;
  };
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [trendingNotes, setTrendingNotes] = useState<Note[]>([]);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotes();
    fetchTrendingNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select(`
        *,
        profiles (
          full_name,
          reputation_level
        )
      `)
      .eq("status", "approved")
      .order("trust_score", { ascending: false });

    if (error) {
      toast.error("Failed to load notes");
      console.error(error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const fetchTrendingNotes = async () => {
    // Get notes with most views in the last 7 days
    const { data } = await supabase
      .from("note_views")
      .select(`
        note_id,
        notes!inner (
          id,
          category,
          level,
          subject,
          topic,
          upvotes,
          trust_score,
          created_at,
          profiles!notes_uploader_id_fkey (
            full_name,
            reputation_level
          )
        )
      `)
      .gte("viewed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(6);

    if (data) {
      // Count views per note and get top 6
      const noteViewCounts = new Map<string, { count: number; note: any }>();
      data.forEach((view: any) => {
        const noteData = view.notes;
        if (noteData) {
          const existing = noteViewCounts.get(noteData.id);
          if (existing) {
            existing.count++;
          } else {
            noteViewCounts.set(noteData.id, { count: 1, note: noteData });
          }
        }
      });

      const trending = Array.from(noteViewCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
        .map(item => item.note);

      setTrendingNotes(trending);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const categoryMatch = selectedCategory === "all" || note.category === selectedCategory;
    const levelMatch = selectedLevel === "all" || note.level === selectedLevel;
    const subjectMatch = selectedSubject === "all" || note.subject === selectedSubject;
    
    const searchMatch = searchQuery === "" || 
      note.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.level.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && levelMatch && subjectMatch && searchMatch;
  });

  const subjects = Array.from(new Set(notes.map((note) => note.subject)));
  const levels = Array.from(new Set(
    notes
      .filter(note => selectedCategory === "all" || note.category === selectedCategory)
      .map((note) => note.level)
  )).sort();

  // Pagination logic
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotes = filteredNotes.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedLevel, selectedSubject, searchQuery]);

  // Reset level filter when category changes
  useEffect(() => {
    setSelectedLevel("all");
  }, [selectedCategory]);

  const getCategoryDisplay = (category: string) => {
    const displays: Record<string, string> = {
      programming: "Programming",
      school: "School",
      university: "University"
    };
    return displays[category] || category;
  };

  const getLevelLabel = (category: string) => {
    const labels: Record<string, string> = {
      programming: "Language",
      school: "Class",
      university: "Semester"
    };
    return labels[category] || "Level";
  };

  const getReputationColor = (level: string) => {
    switch (level) {
      case "Legend":
        return "bg-purple-500";
      case "Top Contributor":
        return "bg-accent";
      case "Active":
        return "bg-success";
      case "Contributor":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Browse Study Notes</h1>
          <p className="text-muted-foreground">Discover quality study materials shared by students</p>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6"
>
            {/* Search Bar */}
            <div className="mb-6">
              <Input
                type="text"
                placeholder="Search by category, subject, topic, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="programming">Programming</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={`Select ${getLevelLabel(selectedCategory)}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {getLevelLabel(selectedCategory)}s</SelectItem>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {selectedCategory === "school" ? `Class ${level}` : 
                       selectedCategory === "university" ? `Semester ${level}` : 
                       level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No notes found. Be the first to upload!</p>
              </Card>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedNotes.map((note) => (
                    <Card key={note.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/notes/${note.id}`)}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <Badge variant="secondary">{getCategoryDisplay(note.category)}</Badge>
                            <Badge variant="outline">
                              {note.category === "school" ? `Class ${note.level}` : 
                               note.category === "university" ? `Sem ${note.level}` : 
                               note.level}
                            </Badge>
                          </div>
                          <Badge className={getReputationColor(note.profiles?.reputation_level || 'Newbie')}>
                            {note.profiles?.reputation_level || 'Newbie'}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">{note.topic}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">
                            <span className="font-medium">Subject:</span> {note.subject}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium">By:</span> {note.profiles?.full_name || 'Anonymous'}
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{note.upvotes} upvotes</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-success">
                          <Award className="h-4 w-4" />
                          <span>{note.trust_score} Trust</span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="trending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Trending This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendingNotes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No trending notes yet</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingNotes.map((note) => (
                      <Card key={note.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/notes/${note.id}`)}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <Badge variant="secondary">{getCategoryDisplay(note.category)}</Badge>
                            </div>
                            <Badge className={getReputationColor(note.profiles?.reputation_level || 'Newbie')}>
                              {note.profiles?.reputation_level || 'Newbie'}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mt-2">{note.topic}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Subject:</span> {note.subject}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">By:</span> {note.profiles?.full_name || 'Anonymous'}
                            </p>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{note.upvotes} upvotes</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-medium text-success">
                            <Award className="h-4 w-4" />
                            <span>{note.trust_score} Trust</span>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Notes;
