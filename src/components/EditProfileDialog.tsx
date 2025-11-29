import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Edit } from "lucide-react";
import { profileUpdateSchema } from "@/lib/validation";

interface EditProfileDialogProps {
  currentProfile: {
    full_name: string;
    university: string;
    course: string;
  };
  onProfileUpdated: () => void;
}

export const EditProfileDialog = ({ currentProfile, onProfileUpdated }: EditProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(currentProfile.full_name || "");
  const [university, setUniversity] = useState(currentProfile.university || "");
  const [course, setCourse] = useState(currentProfile.course || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with zod (all fields optional)
    const validation = profileUpdateSchema.safeParse({
      full_name: fullName,
      university: university,
      course: course
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please login first");
        return;
      }

      const updateData: any = {};
      if (fullName.trim()) updateData.full_name = fullName.trim();
      if (university.trim()) updateData.university = university.trim();
      if (course.trim()) updateData.course = course.trim();

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", session.user.id);

      if (error) throw error;

      // Check if bonus should be awarded (after profile update)
      if (university.trim() && course.trim()) {
        await supabase.rpc("award_profile_bonus", {
          _user_id: session.user.id
        });
        
        // Check if bonus was actually awarded
        const { data: updatedProfile } = await supabase
          .from("profiles")
          .select("profile_bonus_awarded")
          .eq("id", session.user.id)
          .single();
          
        if (updatedProfile?.profile_bonus_awarded) {
          toast.success("Profile updated! You earned 30 GP bonus for completing your profile!");
          setOpen(false);
          onProfileUpdated();
          return;
        }
      }

      toast.success("Profile updated successfully!");
      setOpen(false);
      onProfileUpdated();
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. All fields are optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="university">University</Label>
            <Input
              id="university"
              placeholder="Enter your university name"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Input
              id="course"
              placeholder="Enter your course name"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
