import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoteRequest {
  id: string;
  category: string;
  level: string;
  subject: string;
  topic: string;
  description: string;
  points_offered: number;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export default function RequestNotes() {
  const [requests, setRequests] = useState<NoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<NoteRequest | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("note_requests")
        .select(`
          *,
          profiles!note_requests_requester_id_fkey(full_name)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
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

  const handleUploadFulfillment = async () => {
    if (!uploadFile || !selectedRequest) return;

    // Validate file using schema
    const validation = await import("@/lib/validation").then(m => 
      m.fulfillmentUploadSchema.safeParse({ file: uploadFile })
    );

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage with proper content type
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `fulfillments/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("notes")
        .upload(fileName, uploadFile, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL (1 year expiry)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("notes")
        .createSignedUrl(fileName, 31536000);

      if (urlError || !signedUrlData) {
        throw new Error("Failed to generate file URL");
      }

      // Create fulfillment record
      const { error: fulfillmentError } = await supabase
        .from("request_fulfillments")
        .insert({
          request_id: selectedRequest.id,
          uploader_id: user.id,
          file_url: signedUrlData.signedUrl,
          file_type: 'application/pdf',
          file_size: uploadFile.size,
        });

      if (fulfillmentError) throw fulfillmentError;

      toast({
        title: "Success",
        description: "Your PDF has been submitted for validation!",
      });

      setUploadDialogOpen(false);
      setUploadFile(null);
      setSelectedRequest(null);
      await fetchRequests(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || request.category === selectedCategory;
    const matchesSubject = selectedSubject === "all" || request.subject === selectedSubject;
    return matchesSearch && matchesCategory && matchesSubject;
  });

  const subjects = Array.from(new Set(requests.map((r) => r.subject)));

  const getCategoryDisplay = (category: string) => {
    const displays: Record<string, string> = {
      programming: "Programming",
      school: "School",
      university: "University",
    };
    return displays[category] || category;
  };

  const getLevelLabel = (category: string, level: string) => {
    if (category === "programming") return level;
    if (category === "school") return `Class ${level}`;
    if (category === "university") return `Sem ${level}`;
    return level;
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Request Notes</h1>
        <p className="text-muted-foreground">
          Help fellow students by fulfilling note requests and earn points
        </p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="programming">Programming</SelectItem>
            <SelectItem value="school">School</SelectItem>
            <SelectItem value="university">University</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Subject" />
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
        <Button onClick={() => navigate("/create-request")}>
          Create Request
        </Button>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No open requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">
                    {getCategoryDisplay(request.category)}
                  </Badge>
                  <Badge className="bg-primary text-primary-foreground">
                    {request.points_offered} points
                  </Badge>
                </div>
                <CardTitle className="text-xl">{request.subject}</CardTitle>
                <CardDescription>
                  {getLevelLabel(request.category, request.level)} • {request.topic}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {request.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Requested by {request.profiles?.full_name || "Anonymous"}
                </p>
              </CardContent>
              <CardFooter>
                <Dialog
                  open={uploadDialogOpen && selectedRequest?.id === request.id}
                  onOpenChange={(open) => {
                    setUploadDialogOpen(open);
                    if (!open) {
                      setSelectedRequest(null);
                      setUploadFile(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Fulfill Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Notes</DialogTitle>
                      <DialogDescription>
                        Upload your notes to fulfill this request. File will be validated
                        automatically.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="file">Select PDF File</Label>
                        <Input
                          id="file"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF only, 200KB - 10MB
                        </p>
                      </div>
                      <Button
                        onClick={handleUploadFulfillment}
                        disabled={!uploadFile || uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      </div>
      </div>
    </ProtectedRoute>
  );
}
