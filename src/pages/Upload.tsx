import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload as UploadIcon, Loader2 } from "lucide-react";
import { uploadSchema } from "@/lib/validation";

const Upload = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<"programming" | "school" | "university">("programming");
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file with zod schema
      const fileValidation = uploadSchema.shape.file.safeParse(selectedFile);
      if (!fileValidation.success) {
        toast.error(fileValidation.error.errors[0].message);
        e.target.value = "";
        setFile(null);
        return;
      }

      setFile(selectedFile);
      toast.success(`File selected: ${selectedFile.name}`);
    }
  };

  const handleCategoryChange = (newCategory: "programming" | "school" | "university") => {
    setCategory(newCategory);
    setLevel(""); // Reset level when category changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !level || !subject || !topic || !file) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate all inputs with zod
    const validation = uploadSchema.safeParse({
      category,
      level: level.trim(),
      subject: subject.trim(),
      topic: topic.trim(),
      tags,
      file
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please login first");
        navigate("/auth");
        return;
      }

      // Check daily upload limit
      const { data: uploadCount, error: countError } = await supabase.rpc("get_upload_count", {
        _user_id: session.user.id
      });

      if (countError) {
        console.error("Error checking upload count:", countError);
      } else if (uploadCount >= 3) {
        toast.error("Daily upload limit reached! You can upload a maximum of 3 files per day. Please try again tomorrow.", {
          duration: 5000,
          position: "top-center",
          style: {
            background: "hsl(var(--destructive))",
            color: "hsl(var(--destructive-foreground))",
            fontSize: "16px",
            padding: "16px 24px",
            textAlign: "center"
          }
        });
        setLoading(false);
        return;
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("notes")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get signed URL (1 year expiry for uploaded notes)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("notes")
        .createSignedUrl(fileName, 31536000); // 1 year in seconds

      if (urlError || !signedUrlData) {
        throw new Error("Failed to generate file URL");
      }

      // Save note to database using validated data
      const { error: insertError } = await supabase.from("notes").insert({
        uploader_id: session.user.id,
        category: validation.data.category,
        level: validation.data.level,
        subject: validation.data.subject,
        topic: validation.data.topic,
        file_url: signedUrlData.signedUrl,
        file_type: file.type,
        tags: validation.data.tags,
      });

      if (insertError) {
        throw insertError;
      }

      // Increment daily upload count
      await supabase.rpc("increment_upload_count", { _user_id: session.user.id });

      // Award Gyan Points using secure RPC function
      await supabase.rpc("award_upload_points", { _user_id: session.user.id });

      toast.success("Note uploaded successfully! You earned 10 Gyan Points!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload note");
    } finally {
      setLoading(false);
    }
  };

  const renderLevelSelector = () => {
    switch (category) {
      case "programming":
        return (
          <div className="space-y-2">
            <Label htmlFor="level">Programming Language</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Python">Python</SelectItem>
                <SelectItem value="JavaScript">JavaScript</SelectItem>
                <SelectItem value="TypeScript">TypeScript</SelectItem>
                <SelectItem value="Java">Java</SelectItem>
                <SelectItem value="C++">C++</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="C#">C#</SelectItem>
                <SelectItem value="Go">Go</SelectItem>
                <SelectItem value="Rust">Rust</SelectItem>
                <SelectItem value="PHP">PHP</SelectItem>
                <SelectItem value="Ruby">Ruby</SelectItem>
                <SelectItem value="Swift">Swift</SelectItem>
                <SelectItem value="Kotlin">Kotlin</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      
      case "school":
        return (
          <div className="space-y-2">
            <Label htmlFor="level">Class</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((cls) => (
                  <SelectItem key={cls} value={cls.toString()}>
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "university":
        return (
          <div className="space-y-2">
            <Label htmlFor="level">Semester</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Upload Study Notes</CardTitle>
                <CardDescription>
                  Share your knowledge and earn Gyan Points
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={handleCategoryChange}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="programming">Programming</SelectItem>
                        <SelectItem value="school">School</SelectItem>
                        <SelectItem value="university">University</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {renderLevelSelector()}

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder={
                        category === "programming" ? "e.g., Data Structures, Web Development" :
                        category === "school" ? "e.g., Mathematics, Science, English" :
                        "e.g., Data Structures, Web Development"
                      }
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      placeholder={
                        category === "programming" ? "e.g., Binary Search Trees, React Hooks" :
                        category === "school" ? "e.g., Quadratic Equations, Photosynthesis" :
                        "e.g., Binary Search Trees, React Hooks"
                      }
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      placeholder="e.g., algorithms, data structures, tutorial"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">Upload File (PDF or Image, max 10MB)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="cursor-pointer"
                      />
                      {file && (
                        <span className="text-sm text-muted-foreground">
                          {file.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm text-foreground">
                      <strong>Note:</strong> By uploading, you'll earn 10 Gyan Points instantly! High-quality notes with good ratings will help you level up your reputation.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        Upload Note
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Upload;
