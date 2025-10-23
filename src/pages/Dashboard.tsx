import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Award, FileText, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  full_name: string;
  email: string;
  gyan_points: number;
  reputation_level: string;
  university: string;
  course: string;
}

interface UserNote {
  id: string;
  topic: string;
  subject: string;
  category: string;
  level: string;
  trust_score: number;
  upvotes: number;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      toast.error("Failed to load profile");
    } else {
      setProfile(profileData);
    }

    // Fetch user's notes
    const { data: notesData, error: notesError } = await supabase
      .from("notes")
      .select("*")
      .eq("uploader_id", user.id)
      .order("created_at", { ascending: false });

    if (notesError) {
      toast.error("Failed to load notes");
    } else {
      setNotes(notesData || []);
    }

    setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success";
      case "pending":
        return "bg-warning";
      case "quarantined":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast.success("Note deleted successfully");
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">My Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gyan Points</CardTitle>
                <Award className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{profile?.gyan_points || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload quality notes to earn more
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reputation Level</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <Badge className={`${getReputationColor(profile?.reputation_level || "")} text-base`}>
                  {profile?.reputation_level || "Newbie"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Keep contributing to level up
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{notes.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Notes uploaded by you
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Profile Info */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profile Information</CardTitle>
              {profile && (
                <EditProfileDialog
                  currentProfile={{
                    full_name: profile.full_name || "",
                    university: profile.university || "",
                    course: profile.course || ""
                  }}
                  onProfileUpdated={fetchUserData}
                />
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{profile?.full_name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">University</p>
                  <p className="font-medium">{profile?.university || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-medium">{profile?.course || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Notes */}
          <Card>
            <CardHeader>
              <CardTitle>My Uploaded Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  You haven't uploaded any notes yet. Start sharing your knowledge!
                </p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{note.topic}</h3>
                        <p className="text-sm text-muted-foreground">
                          {note.subject} • {note.category === "school" ? `Class ${note.level}` : 
                           note.category === "university" ? `Semester ${note.level}` : 
                           note.level}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Trust Score: {note.trust_score}</p>
                          <p className="text-xs text-muted-foreground">{note.upvotes} upvotes</p>
                        </div>
                        <Badge className={getStatusColor(note.status)}>
                          {note.status}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{note.topic}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
