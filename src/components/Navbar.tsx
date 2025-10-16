import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { BookOpen, Upload, Home, User as UserIcon, LogOut, Info, Shield, FileText, MessageSquare, ListChecks } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/padhai-logo.png";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const hasAdminRole = roles?.some((r) => r.role === "admin" || r.role === "moderator");
    setIsAdmin(hasAdminRole || false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Padhai Co." className="h-10 w-auto" />
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/" className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link to="/notes" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">Browse Notes</span>
          </Link>
          {user && (
            <Link to="/upload" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <Upload className="h-4 w-4" />
              <span className="hidden md:inline">Upload</span>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/request-notes")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Request Notes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/my-requests")}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  My Requests
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/about")}>
                  <Info className="mr-2 h-4 w-4" />
                  About
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/privacy")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Privacy Policy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/terms")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Terms & Conditions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary-hover">
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
