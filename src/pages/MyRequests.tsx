import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ThumbsUp, ThumbsDown, FileText, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface NoteRequest {
  id: string;
  category: string;
  level: string;
  subject: string;
  topic: string;
  description: string;
  points_offered: number;
  status: string;
  created_at: string;
}

interface Fulfillment {
  id: string;
  file_url: string;
  file_type: string;
  status: string;
  validation_errors: string[] | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  auto_review_at: string;
  request_fulfillments: {
    id: string;
    category: string;
    level: string;
    subject: string;
    topic: string;
    points_offered: number;
  };
  profiles: {
    full_name: string;
  };
}

export default function MyRequests() {
  const [myRequests, setMyRequests] = useState<NoteRequest[]>([]);
  const [pendingFulfillments, setPendingFulfillments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch user's requests
      const { data: requests, error: requestsError } = await supabase
        .from("note_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;
      setMyRequests(requests || []);

      // Fetch pending fulfillments for user's requests
      const { data: fulfillments, error: fulfillmentsError } = await supabase
        .from("request_fulfillments")
        .select(`
          *,
          note_requests!inner(
            id,
            category,
            level,
            subject,
            topic,
            points_offered,
            requester_id
          ),
          profiles(full_name)
        `)
        .eq("note_requests.requester_id", user.id)
        .in("status", ["awaiting_approval", "community_review"]);

      if (fulfillmentsError) throw fulfillmentsError;
      setPendingFulfillments(fulfillments || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (fulfillmentId: string, approved: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("process_fulfillment_approval", {
        _fulfillment_id: fulfillmentId,
        _approved: approved,
        _reviewer_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: approved ? "Fulfillment approved! Request is now closed." : "Fulfillment rejected. Request remains open.",
      });

      // Refresh data to show updated status
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleVote = async (fulfillmentId: string, voteType: "upvote" | "downvote") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("fulfillment_votes")
        .upsert({
          fulfillment_id: fulfillmentId,
          user_id: user.id,
          vote_type: voteType,
        }, {
          onConflict: "fulfillment_id,user_id"
        });

      if (error) throw error;

      // Trigger community validation check
      await supabase.rpc("check_community_validation", {
        _fulfillment_id: fulfillmentId,
      });

      toast({
        title: "Vote recorded",
        description: "Thank you for your feedback!",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      <h1 className="text-4xl font-bold mb-8">My Requests</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({pendingFulfillments.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Requests ({myRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingFulfillments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No pending fulfillments to review</p>
              </CardContent>
            </Card>
          ) : (
            pendingFulfillments.map((fulfillment) => (
              <Card key={fulfillment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{fulfillment.note_requests.subject}</CardTitle>
                      <CardDescription>
                        {fulfillment.note_requests.topic} • Uploaded by {fulfillment.profiles?.full_name}
                      </CardDescription>
                    </div>
                    <Badge variant={fulfillment.status === "awaiting_approval" ? "default" : "secondary"}>
                      {fulfillment.status === "awaiting_approval" ? "Awaiting Your Review" : "Community Review"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPreviewUrl(fulfillment.file_url)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Preview File
                    </Button>
                  </div>

                  {fulfillment.status === "community_review" && (
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span>{fulfillment.upvotes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <span>{fulfillment.downvotes}</span>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(fulfillment.id, "upvote")}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(fulfillment.id, "downvote")}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {fulfillment.status === "awaiting_approval" && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleApproval(fulfillment.id, true)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleApproval(fulfillment.id, false)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">You haven't created any requests yet</p>
              </CardContent>
            </Card>
          ) : (
            myRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{request.subject}</CardTitle>
                      <CardDescription>{request.topic}</CardDescription>
                    </div>
                    <Badge variant={
                      request.status === "fulfilled" ? "default" :
                      request.status === "cancelled" ? "destructive" : "secondary"
                    }>
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Points offered: {request.points_offered}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
            <DialogDescription>Review the uploaded PDF file</DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <div className="w-full h-full flex items-center justify-center">
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-full rounded-lg"
              >
                <p className="text-center">
                  PDF preview not available.{" "}
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Download PDF
                  </a>
                </p>
              </object>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
}
