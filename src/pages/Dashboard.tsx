import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings, LogOut, Plus, ListTodo, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import MoodSelector from "@/components/MoodSelector";
import TaskList from "@/components/TaskList";
import AddTaskDialog from "@/components/AddTaskDialog";
import SuggestedTask from "@/components/SuggestedTask";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [focusCount, setFocusCount] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setLoading(false);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getMoodMessage = (mood: number) => {
    if (mood <= 2) return "Let's start easy. Small steps lead to big wins! 🌱";
    if (mood === 3) return "You're doing great! Let's keep the momentum going. 💪";
    return "You're on fire! Time to tackle those challenges! 🔥";
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
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome back, {user?.email?.split("@")[0] || "there"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Let's make today productive 🚀
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">
              <ListTodo className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="calendar" onClick={() => navigate("/calendar")}>
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="finance" onClick={() => navigate("/finance")}>
              <DollarSign className="h-4 w-4 mr-2" />
              Finance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6 mt-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <ListTodo className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Focus</p>
                    <p className="text-2xl font-bold">{focusCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-accent">
                    <svg className="h-6 w-6 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold">{totalTime}h</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <Button
                  onClick={() => setShowAddTask(true)}
                  className="w-full h-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </Card>
            </div>

            {/* Mood Selector */}
            {!selectedMood ? (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">How are you feeling today?</h2>
                <p className="text-muted-foreground mb-6">
                  Select your mood to get personalized task recommendations
                </p>
                <MoodSelector onMoodSelect={setSelectedMood} />
              </Card>
            ) : (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-center font-medium">{getMoodMessage(selectedMood)}</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedMood(null)}
                  className="mx-auto block mt-2"
                >
                  Change mood
                </Button>
              </div>
            )}

            <SuggestedTask mood={selectedMood} refreshKey={refreshKey} />

            <TaskList mood={selectedMood} onTasksChange={() => setRefreshKey(prev => prev + 1)} refreshKey={refreshKey} onStatsUpdate={(focus, time) => {
              setFocusCount(focus);
              setTotalTime(time);
            }} />

            <AddTaskDialog
              open={showAddTask}
              onOpenChange={setShowAddTask}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}