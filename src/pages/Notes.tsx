import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { FileText, ThumbsUp, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  semester: number;
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
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotes();
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

  const filteredNotes = notes.filter((note) => {
    const semesterMatch = selectedSemester === "all" || note.semester.toString() === selectedSemester;
    const subjectMatch = selectedSubject === "all" || note.subject === selectedSubject;
    
    const searchMatch = searchQuery === "" || 
      note.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.semester.toString().includes(searchQuery);
    
    return semesterMatch && subjectMatch && searchMatch;
  });

  const subjects = Array.from(new Set(notes.map((note) => note.subject)));

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

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search by semester, subject, username, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((sem) => (
                <SelectItem key={sem} value={sem.toString()}>
                  Semester {sem}
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/notes/${note.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <Badge variant="secondary">Sem {note.semester}</Badge>
                    </div>
                    <Badge className={getReputationColor(note.profiles.reputation_level)}>
                      {note.profiles.reputation_level}
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
                      <span className="font-medium">By:</span> {note.profiles.full_name}
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
      </div>
    </div>
  );
};

export default Notes;
