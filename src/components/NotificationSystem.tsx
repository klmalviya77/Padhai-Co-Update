import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "exam_alert" | "new_upload" | "price_drop" | "offer";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  link?: string;
}

export const NotificationSystem = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to new notifications using realtime
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        } as any,
        (payload: any) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          
          // Show toast for new notification
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading notifications:", error);
      return;
    }

    // Cast the data to proper type
    const typedNotifications = (data || []) as Notification[];
    setNotifications(typedNotifications);
    setUnreadCount(typedNotifications.filter((n) => !n.read).length);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", session.user.id)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await (supabase as any)
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("Notification deleted");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "exam_alert":
        return "📚";
      case "new_upload":
        return "📄";
      case "price_drop":
        return "💰";
      case "offer":
        return "🎁";
      default:
        return "🔔";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "px-3 py-3 cursor-pointer flex items-start gap-3",
                !notification.read && "bg-accent/50"
              )}
              onSelect={(e) => {
                e.preventDefault();
                markAsRead(notification.id);
                if (notification.link) {
                  window.location.href = notification.link;
                }
              }}
            >
              <span className="text-2xl flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
