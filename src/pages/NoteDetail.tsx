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
import { ThumbsUp, ThumbsDown, Flag, Award, User, Calendar, Loader2, ArrowLeft, Download, MessageCircle, Trash2, Bookmark, BookmarkCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PDFPreview } from "@/components/PDFPreview";
import { reportSchema } from "@/lib/validation";

interface NoteData {
  id: string;
  category: string;
  level: string;
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

interface Note {
  id: string;
  topic: string;
  subject: string;
  category: string;
  level: string;
  trust_score: number;
  file_type: string;
  profiles: {
    full_name: string;
    reputation_level: string;
  };
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: {
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);

  useEffect(() => {
    fetchNoteAndUserData();
    fetchComments();
    checkIfSaved();
    trackView();
    fetchRelatedNotes();
  }, [noteId]);

  const checkIfSaved = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from("saved_notes")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("note_id", noteId)
      .maybeSingle();

    setIsSaved(!!data);
  };

  const trackView = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id || !noteId) return;

    // Track that this user viewed this note
    await supabase
      .from("note_views")
      .upsert({
        user_id: session.user.id,
        note_id: noteId,
      }, { onConflict: "user_id,note_id" });
  };

  const fetchRelatedNotes = async () => {
    if (!note) return;

    // Get notes that users who viewed this note also viewed
    const { data: viewsData } = await supabase
      .from("note_views")
      .select("user_id")
      .eq("note_id", noteId)
      .limit(20);

    if (!viewsData || viewsData.length === 0) return;

    const userIds = viewsData.map(v => v.user_id);

    // Get other notes these users viewed
    const { data: relatedData } = await supabase
      .from("note_views")
      .select(`
        note_id,
        notes!inner (
          id,
          topic,
          subject,
          category,
          level,
          trust_score,
          file_type,
          profiles!notes_uploader_id_fkey (
            full_name,
            reputation_level
          )
        )
      `)
      .in("user_id", userIds)
      .neq("note_id", noteId)
      .limit(6);

    if (relatedData) {
      // Extract unique notes and sort by frequency
      const noteMap = new Map<string, any>();
      relatedData.forEach((item: any) => {
        const noteData = item.notes;
        if (noteData && !noteMap.has(noteData.id)) {
          noteMap.set(noteData.id, noteData);
        }
      });
      
      setRelatedNotes(Array.from(noteMap.values()).slice(0, 3));
    }
  };

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

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        user_id,
        comment_text,
        created_at,
        profiles (
          full_name,
          reputation_level
        )
      `)
      .eq("note_id", noteId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComments(data as any);
    }
  };

  const handleAddComment = async () => {
    if (!currentUserId) {
      toast.error("Please login to comment");
      navigate("/auth");
      return;
    }

    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      toast.error("Comment cannot be empty");
      return;
    }

    if (trimmedComment.length > 500) {
      toast.error("Comment must be less than 500 characters");
      return;
    }

    setSubmittingComment(true);

    const { error } = await supabase
      .from("comments")
      .insert({
        note_id: noteId!,
        user_id: currentUserId,
        comment_text: trimmedComment,
      });

    if (error) {
      toast.error("Failed to post comment");
      console.error("Comment error:", error);
    } else {
      toast.success("Comment posted!");
      setNewComment("");
      fetchComments();
    }

    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("Failed to delete comment");
    } else {
      toast.success("Comment deleted");
      fetchComments();
    }
  };

  const handleSaveNote = async () => {
    if (!currentUserId) {
      toast.error("Please login to save notes");
      navigate("/auth");
      return;
    }

    setSavingNote(true);

    if (isSaved) {
      // Remove from library
      const { error } = await supabase
        .from("saved_notes")
        .delete()
        .eq("user_id", currentUserId)
        .eq("note_id", noteId);

      if (error) {
        toast.error("Failed to remove from library");
      } else {
        toast.success("Removed from library");
        setIsSaved(false);
      }
    } else {
      // Add to library
      const { error } = await supabase
        .from("saved_notes")
        .insert({
          user_id: currentUserId,
          note_id: noteId!,
        });

      if (error) {
        toast.error("Failed to save to library");
      } else {
        toast.success("Saved to library!");
        setIsSaved(true);
      }
    }

    setSavingNote(false);
  };

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!currentUserId) {
      toast.error("Please login to vote");
      navigate("/auth");
      return;
    }

    // Check for spam voting
    const { data: isSpam, error: spamError } = await supabase.rpc("check_vote_spam", {
      _user_id: currentUserId
    });

    if (spamError) {
      console.error("Error checking spam:", spamError);
    } else if (isSpam) {
      toast.error("Voting too quickly! Please slow down to prevent spam detection.", {
        duration: 4000,
        position: "top-center",
        style: {
          background: "hsl(var(--destructive))",
          color: "hsl(var(--destructive-foreground))",
          fontSize: "16px",
          padding: "16px 24px"
        }
      });
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
        
        // Log vote activity for spam tracking
        await supabase.from("vote_activity").insert({
          user_id: currentUserId,
          note_id: noteId!,
          vote_type: "remove"
        });
        
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
        // Log vote activity for spam tracking
        await supabase.from("vote_activity").insert({
          user_id: currentUserId,
          note_id: noteId!,
          vote_type: voteType
        });
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

      // Update local state immediately for instant UI feedback
      setNote({
        ...note,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        trust_score: newTrustScore,
      });

      // Update database in background
      await supabase
        .from("notes")
        .update({
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          trust_score: newTrustScore,
        })
        .eq("id", noteId);
    }
  };

  const handleReport = async () => {
    if (!currentUserId) {
      toast.error("Please login to report");
      navigate("/auth");
      return;
    }

    // Validate report reason with zod
    const validation = reportSchema.safeParse({ reason: reportReason });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      note_id: noteId!,
      reason: validation.data.reason,
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
    // Fixed cost of 75 GP for all downloads
    return 75;
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

    setDownloading(true);

    try {
      // Deduct points using secure RPC function
      const { data: success, error } = await supabase.rpc("deduct_download_points", { 
        _user_id: currentUserId,
        _cost: downloadCost 
      });

      if (error) {
        toast.error("Failed to process download");
        console.error("Download error:", error);
        setDownloading(false);
        return;
      }

      if (!success) {
        toast.error(`You need ${downloadCost} Gyan Points to download this file. You have ${userProfile.gyan_points} points.`);
        setDownloading(false);
        return;
      }

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
      setUserProfile({ ...userProfile, gyan_points: userProfile.gyan_points - downloadCost });
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
                      <Badge variant="secondary">
                        {note.category === "programming" ? note.level :
                         note.category === "school" ? `Class ${note.level}` :
                         `Semester ${note.level}`}
                      </Badge>
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
                  <div className="space-y-4">
                    <PDFPreview fileUrl={note.file_url} />
                    <Button 
                      onClick={handleDownload} 
                      disabled={downloading || !userProfile || userProfile.gyan_points < calculateDownloadCost()} 
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Full PDF ({calculateDownloadCost()} points)
                    </Button>
                  </div>
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
                <div className="flex gap-4 justify-between items-center flex-wrap">
                  <div className="flex gap-2 items-center flex-wrap">
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
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">Total: {note.upvotes + note.downvotes}</span> votes
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <Button
                      variant={isSaved ? "default" : "outline"}
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={savingNote}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="mr-2 h-4 w-4" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="mr-2 h-4 w-4" />
                          Save to Library
                        </>
                      )}
                    </Button>

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

        {/* Comments Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Comment Form */}
            {currentUserId ? (
              <div className="space-y-3">
                <Label htmlFor="new-comment">Add a comment</Label>
                <Textarea
                  id="new-comment"
                  placeholder="Share your thoughts about this note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {newComment.length}/500 characters
                  </span>
                  <Button 
                    onClick={handleAddComment} 
                    disabled={submittingComment || !newComment.trim()}
                  >
                    {submittingComment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Post Comment"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-2">Login to join the discussion</p>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Login
                </Button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{comment.profiles.full_name}</span>
                        <Badge 
                          variant="secondary" 
                          className={getReputationColor(comment.profiles.reputation_level)}
                        >
                          {comment.profiles.reputation_level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {currentUserId === comment.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{comment.comment_text}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Related Notes Section */}
        {relatedNotes.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Students Also Viewed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {relatedNotes.map((relatedNote) => (
                  <Card
                    key={relatedNote.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/notes/${relatedNote.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-sm line-clamp-2">
                        {relatedNote.topic}
                      </CardTitle>
                      <div className="flex gap-1 flex-wrap pt-1">
                        <Badge variant="secondary" className="text-xs">
                          {relatedNote.category === "programming" ? relatedNote.level :
                           relatedNote.category === "school" ? `Class ${relatedNote.level}` :
                           `Semester ${relatedNote.level}`}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{relatedNote.subject}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">{relatedNote.profiles.full_name}</span>
                        <span className="font-semibold text-success">★ {relatedNote.trust_score}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NoteDetail;
