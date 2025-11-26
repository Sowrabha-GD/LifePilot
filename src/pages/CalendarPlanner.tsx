import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, MapPin, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CalendarPlanner() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        checkGoogleConnection();
        loadEvents();
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkGoogleConnection = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_access_token")
        .single();
      
      setIsConnected(!!profile?.google_access_token);
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(20);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/calendar`;
    const scope = "https://www.googleapis.com/auth/calendar.readonly";
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const syncCalendar = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-calendar");
      
      if (error) throw error;
      
      toast.success(`Synced ${data.count} events`);
      await loadEvents();
      
      // Calculate travel times
      await supabase.functions.invoke("calculate-travel");
      await loadEvents();
    } catch (error: any) {
      toast.error(error.message || "Failed to sync calendar");
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, h:mm a");
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Calendar Planner
            </h1>
            <p className="text-muted-foreground">Smart scheduling with travel time</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/settings")}>
              Settings
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected ? (
          <Card className="p-6 text-center space-y-4">
            <Calendar className="h-12 w-12 mx-auto text-primary" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Connect Google Calendar</h2>
              <p className="text-muted-foreground mb-4">
                Sync your events and get smart scheduling recommendations
              </p>
              <Button onClick={connectGoogleCalendar}>
                Connect Calendar
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {events.length} upcoming events
              </p>
              <Button onClick={syncCalendar} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </div>

            {/* Events List */}
            <div className="space-y-4">
              {events.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No upcoming events</p>
                </Card>
              ) : (
                events.map((event) => (
                  <Card key={event.id} className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{formatTime(event.start_time)}</span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {event.travel_time_seconds && (
                      <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-medium">Smart Schedule</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Travel time:</span>{" "}
                            <span className="font-medium">
                              {formatDuration(event.travel_time_seconds)}
                            </span>
                          </div>
                          {event.recommended_leave_time && (
                            <div>
                              <span className="text-muted-foreground">Leave by:</span>{" "}
                              <span className="font-medium">
                                {formatTime(event.recommended_leave_time)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}