import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Gift, Users, Award, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReferralStats {
  total_referrals: number;
  monthly_referrals: number;
  pending_referrals: number;
  total_points_earned: number;
}

interface Referral {
  id: string;
  referred_user_id: string;
  status: string;
  points_awarded: number;
  created_at: string;
  completed_at: string | null;
  profiles: {
    full_name: string;
  };
}

const ReferEarn = () => {
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch referral code
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    if (profile) {
      setReferralCode(profile.referral_code);
    }

    // Fetch referral stats
    const { data: statsData } = await supabase.rpc("get_referral_stats", {
      _user_id: user.id
    });

    if (statsData && statsData.length > 0) {
      setStats(statsData[0]);
    }

    // Fetch referral list with proper foreign key specification
    const { data: referralList } = await supabase
      .from("referrals")
      .select(`
        id,
        referred_user_id,
        status,
        points_awarded,
        created_at,
        completed_at,
        profiles!referrals_referred_user_id_fkey (
          full_name
        )
      `)
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralList) {
      setReferrals(referralList as any);
    }

    setLoading(false);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = () => {
    const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
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

  const monthlyLimit = 5;
  const remainingReferrals = monthlyLimit - (stats?.monthly_referrals || 0);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Refer & Earn
            </h1>
            <p className="text-muted-foreground">
              Share your referral code and earn 20 Gyan Points for each successful referral!
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {stats?.monthly_referrals || 0}/{monthlyLimit}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {remainingReferrals} referrals remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Gift className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">
                  {stats?.pending_referrals || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Waiting for first upload
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Users className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {stats?.total_referrals || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All-time successful
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
                <Award className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {stats?.total_points_earned || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From referrals
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Referral Code Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Referral Code</CardTitle>
              <CardDescription>
                Share this code with friends to earn points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    value={referralCode}
                    readOnly
                    className="text-2xl font-bold text-center tracking-wider"
                  />
                </div>
                <Button onClick={copyReferralCode} variant="outline">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
                <Button onClick={shareReferralLink}>
                  Share Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How to Use Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
              <CardDescription>
                Follow these simple steps to earn Gyan Points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Share your referral code</h3>
                    <p className="text-sm text-muted-foreground">
                      Copy your unique referral code and share it with your friends, classmates, or on social media.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Ask them to sign up using your code</h3>
                    <p className="text-sm text-muted-foreground">
                      When they create an account, they need to enter your referral code during signup.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Wait for them to upload their first note</h3>
                    <p className="text-sm text-muted-foreground">
                      The referral becomes successful only when your friend uploads their first study note.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Receive 20 Gyan Points automatically</h3>
                    <p className="text-sm text-muted-foreground">
                      Once they upload, you'll instantly receive 20 Gyan Points! You can earn from up to 5 successful referrals per month.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">Important Notes:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>You can refer up to 5 new users per month</li>
                  <li>Points are awarded only when the referred user uploads their first note</li>
                  <li>The referral limit resets at the beginning of each month</li>
                  <li>Each user can be referred only once</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Referral History */}
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>
                Track your referrals and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No referrals yet. Start sharing your code to earn points!
                </p>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{referral.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {referral.status === "completed" ? (
                          <>
                            <Badge className="bg-success">
                              <Check className="mr-1 h-3 w-3" />
                              Completed
                            </Badge>
                            <div className="text-right">
                              <p className="font-bold text-accent">+{referral.points_awarded} pts</p>
                              <p className="text-xs text-muted-foreground">
                                {referral.completed_at && new Date(referral.completed_at).toLocaleDateString()}
                              </p>
                            </div>
                          </>
                        ) : (
                          <Badge variant="outline" className="border-warning text-warning">
                            Pending Upload
                          </Badge>
                        )}
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

export default ReferEarn;
