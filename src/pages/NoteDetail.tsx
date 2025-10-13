import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown, Flag, Award, User, Calendar, Loader2, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { PDFPreview } from "@/components/PDFPreview";

interface NoteData {
  id: string;
  semester: number;
  subject: string;
  topic: string;
  file_url: string;
  file_type: string;
  upvotes: number;
  downvotes: number;
  trust_score: number;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    reputation_level: string;
  };
}

const NoteDetail = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchNoteAndUserData();
  }, [noteId]);

  const fetchNoteAndUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);

    const { data: noteData, error: noteError } = await supabase
      .from("notes")
      .select(`
        *,
        profiles (
          id,
          full_name,
          reputation_level
        )
      `)
      .eq("id", noteId)
      .single();

    if (noteError) {
      toast.error("Failed to load note");
      navigate("/notes");
      return;
    }

    setNote(noteData);

    if (session?.user?.id) {
      const { data: voteData } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("note_id", noteId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      setUserVote(voteData?.vote_type || null);

      // Fetch user profile for Gyan Points
      const { data: profile } = await supabase
        .from("profiles")
        .select("gyan_points")
        .eq("id", session.user.id)
        .single();
      
      setUserProfile(profile);
    }

    setLoading(false);
  };

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!currentUserId) {
      toast.error("Please login to vote");
      navigate("/auth");
      return;
    }

    let upvoteDelta = 0;
    let downvoteDelta = 0;

    if (userVote === voteType) {
      // Remove vote
      const { error } = await supabase
        .from("votes")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", currentUserId);

      if (!error) {
        setUserVote(null);
        if (voteType === "upvote") upvoteDelta = -1;
        else downvoteDelta = -1;
        toast.success("Vote removed");
      }
    } else {
      // Add or update vote
      const { error } = await supabase
        .from("votes")
        .upsert({
          note_id: noteId!,
          user_id: currentUserId,
          vote_type: voteType,
        });

      if (!error) {
        if (userVote) {
          // Changing vote
          if (voteType === "upvote") {
            upvoteDelta = 1;
            downvoteDelta = -1;
          } else {
            upvoteDelta = -1;
            downvoteDelta = 1;
          }
        } else {
          // New vote
          if (voteType === "upvote") upvoteDelta = 1;
          else downvoteDelta = 1;
        }
        setUserVote(voteType);
        toast.success(`Note ${voteType}d!`);
      } else {
        toast.error("Failed to vote");
        return;
      }
    }

    // Update note counts
    if (note && (upvoteDelta !== 0 || downvoteDelta !== 0)) {
      const newUpvotes = note.upvotes + upvoteDelta;
      const newDownvotes = note.downvotes + downvoteDelta;
      const newTrustScore = newUpvotes - newDownvotes;

      await supabase
        .from("notes")
        .update({
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          trust_score: newTrustScore,
        })
        .eq("id", noteId);

      fetchNoteAndUserData();
    }
  };

  const handleReport = async () => {
    if (!currentUserId) {
      toast.error("Please login to report");
      navigate("/auth");
      return;
    }

    if (!reportReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      note_id: noteId!,
      reason: reportReason,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You have already reported this note");
      } else {
        toast.error("Failed to submit report");
      }
    } else {
      toast.success("Report submitted successfully");
      setReportReason("");
    }
  };

  const calculateDownloadCost = () => {
    if (!note) return 50;
    const trustScore = note.trust_score || 0;
    
    // Base cost is 50 points, increases by 5 points for every 10 trust score points
    const additionalCost = Math.floor(trustScore / 10) * 5;
    return 50 + additionalCost;
  };

  const handleDownload = async () => {
    if (!currentUserId) {
      toast.error("Please login to download");
      navigate("/auth");
      return;
    }

    if (!userProfile) {
      toast.error("Unable to fetch user profile");
      return;
    }

    const downloadCost = calculateDownloadCost();
    
    if (userProfile.gyan_points < downloadCost) {
      toast.error(`You need ${downloadCost} Gyan Points to download this file. You have ${userProfile.gyan_points} points.`);
      return;
    }

    setDownloading(true);

    try {
      // Deduct points
      const newPoints = userProfile.gyan_points - downloadCost;
      await supabase
        .from("profiles")
        .update({ gyan_points: newPoints })
        .eq("id", currentUserId);

      // Download the file
      const link = document.createElement("a");
      link.href = note!.file_url;
      const fileName = note!.file_type.includes("pdf") 
        ? `${note!.topic}.pdf` 
        : `${note!.topic}.${note!.file_type.split("/")[1]}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`File downloaded! ${downloadCost} Gyan Points deducted.`);
      
      // Update local state
      setUserProfile({ ...userProfile, gyan_points: newPoints });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!note) {
    return null;
  }

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
        <Button variant="ghost" onClick={() => navigate("/notes")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Notes
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <CardTitle className="text-2xl mb-2">{note.topic}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">Semester {note.semester}</Badge>
                      <Badge variant="outline">{note.subject}</Badge>
                    </div>
                  </div>
                  <Badge className={getReputationColor(note.profiles.reputation_level)}>
                    {note.profiles.reputation_level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* File Preview */}
                {note.file_type.includes("pdf") ? (
                  <PDFPreview
                    fileUrl={note.file_url}
                    onDownload={handleDownload}
                    canDownload={!downloading && userProfile && userProfile.gyan_points >= calculateDownloadCost()}
                    downloadCost={calculateDownloadCost()}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-8 mb-6 min-h-[400px] flex items-center justify-center">
                      <img
                        src={note.file_url}
                        alt={note.topic}
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                    <Button 
                      onClick={handleDownload} 
                      disabled={downloading || !userProfile || userProfile.gyan_points < calculateDownloadCost()} 
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Image ({calculateDownloadCost()} points)
                    </Button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      variant={userVote === "upvote" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleVote("upvote")}
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      {note.upvotes}
                    </Button>
                    <Button
                      variant={userVote === "downvote" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleVote("downvote")}
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      {note.downvotes}
                    </Button>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Flag className="mr-2 h-4 w-4" />
                        Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report Note</DialogTitle>
                        <DialogDescription>
                          Help us maintain quality by reporting inappropriate content
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason">Reason for reporting</Label>
                          <Textarea
                            id="reason"
                            placeholder="Please describe why you're reporting this note..."
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleReport} className="w-full">
                          Submit Report
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Uploader Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uploaded By</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{note.profiles.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{note.profiles.reputation_level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Trust Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trust Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success mb-2">
                      {note.trust_score}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Community verified quality
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetail;
