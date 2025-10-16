import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type EducationCategory = "programming" | "school" | "university";

export default function CreateRequest() {
  const [category, setCategory] = useState<EducationCategory | "">("");
  const [level, setLevel] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [pointsOffered, setPointsOffered] = useState<string>("10");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !level || !subject || !topic || !pointsOffered) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const points = parseInt(pointsOffered);
    if (isNaN(points) || points < 5) {
      toast({
        title: "Error",
        description: "Points offered must be at least 5",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user has enough points
      const { data: profile } = await supabase
        .from("profiles")
        .select("gyan_points")
        .eq("id", user.id)
        .single();

      if (!profile || profile.gyan_points < points) {
        throw new Error("Insufficient points");
      }

      // Deduct points from user
      const { error: deductError } = await supabase.rpc("deduct_download_points", {
        _user_id: user.id,
        _cost: points,
      });

      if (deductError) throw deductError;

      // Create request
      const { error: requestError } = await supabase
        .from("note_requests")
        .insert([{
          requester_id: user.id,
          category: category as EducationCategory,
          level,
          subject,
          topic,
          description,
          points_offered: points,
        }]);

      if (requestError) throw requestError;

      toast({
        title: "Success",
        description: "Your request has been created!",
      });

      navigate("/my-requests");
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

  const getLevelOptions = () => {
    if (category === "programming") {
      return ["Python", "Java", "C++", "JavaScript", "C", "Go", "Rust", "Other"];
    } else if (category === "school") {
      return Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    } else if (category === "university") {
      return Array.from({ length: 8 }, (_, i) => (i + 1).toString());
    }
    return [];
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Note Request</CardTitle>
          <CardDescription>
            Request specific notes from the community. You'll pay points when someone fulfills your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(value) => {
                setCategory(value as EducationCategory);
                setLevel("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programming">Programming</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {category && (
              <div>
                <Label htmlFor="level">
                  {category === "programming" ? "Language" : category === "school" ? "Class" : "Semester"} *
                </Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${category === "programming" ? "language" : category === "school" ? "class" : "semester"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getLevelOptions().map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={category === "programming" ? "e.g., Data Structures" : "e.g., Physics"}
              />
            </div>

            <div>
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={category === "programming" ? "e.g., Binary Trees" : "e.g., Newton's Laws"}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any specific requirements or details..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="points">Points Offered *</Label>
              <Input
                id="points"
                type="number"
                min="5"
                value={pointsOffered}
                onChange={(e) => setPointsOffered(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 5 points. These will be deducted from your balance and awarded to whoever fulfills your request.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/request-notes")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Request"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
