import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Lightbulb, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  difficulty: number;
  estimated_time: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SuggestedTaskProps {
  mood: number | null;
  refreshKey?: number;
}

const SuggestedTask = ({ mood, refreshKey }: SuggestedTaskProps) => {
  const [suggestedTask, setSuggestedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (mood) {
      fetchSuggestedTask();
    } else {
      setSuggestedTask(null);
    }
  }, [mood, refreshKey]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!mood) return;

    const channel = supabase
      .channel("tasks-changes-suggested")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          fetchSuggestedTask();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mood]);

  const fetchSuggestedTask = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      setLoading(false);
      return;
    }

    const tasks = data || [];
    if (tasks.length === 0) {
      setSuggestedTask(null);
      setLoading(false);
      return;
    }

    // Filter and suggest based on mood
    let suggested: Task | null = null;

    if (mood <= 2) {
      // Low mood: Find easiest incomplete task
      const easyTasks = tasks.filter(t => t.difficulty <= 3);
      if (easyTasks.length > 0) {
        suggested = easyTasks.reduce((prev, current) =>
          current.difficulty < prev.difficulty ? current : prev
        );
      }
    } else if (mood === 3) {
      // Neutral: Find medium priority task
      const mediumTasks = tasks.filter(t => t.priority === "medium");
      suggested = mediumTasks.length > 0 ? mediumTasks[0] : tasks[0];
    } else {
      // High mood: Find challenging high-priority task
      const hardTasks = tasks.filter(t => t.difficulty >= 4);
      const highPriorityTasks = hardTasks.length > 0 
        ? hardTasks.filter(t => t.priority === "high")
        : tasks.filter(t => t.priority === "high");
      suggested = highPriorityTasks.length > 0 ? highPriorityTasks[0] : tasks[0];
    }

    setSuggestedTask(suggested);
    setLoading(false);
  };

  const completeTask = async () => {
    if (!suggestedTask) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", suggestedTask.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete task",
      });
    } else {
      toast({
        title: "Great job! 🎉",
        description: `Completed: ${suggestedTask.title}`,
      });
      // Fetch next suggestion
      await fetchSuggestedTask();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-accent text-accent-foreground";
      case "low":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "text-green-600";
    if (difficulty <= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getMoodSuggestionMessage = () => {
    if (!mood) return "";
    if (mood <= 2) return "💪 Start with something easy to build momentum";
    if (mood === 3) return "⚡ Let's tackle a medium challenge";
    return "🔥 Time to crush a big challenge!";
  };

  if (!mood) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Select your mood to get personalized task suggestions</p>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Finding the perfect task for you...</div>
      </Card>
    );
  }

  if (!suggestedTask) {
    return (
      <Card className="p-6 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">🎉 All tasks completed!</p>
          <p className="text-sm text-muted-foreground">Great work! Add more tasks to keep going.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-muted-foreground">Suggested Task</h3>
          </div>
          <p className="text-xs text-muted-foreground">{getMoodSuggestionMessage()}</p>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold mb-2">{suggestedTask.title}</h2>
            {suggestedTask.description && (
              <p className="text-sm text-muted-foreground">{suggestedTask.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={getPriorityColor(suggestedTask.priority)}>
              {suggestedTask.priority} priority
            </Badge>
            <Badge variant="outline" className={`border-2 ${getDifficultyColor(suggestedTask.difficulty)}`}>
              Difficulty: {suggestedTask.difficulty}/5
            </Badge>
            {suggestedTask.estimated_time && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {suggestedTask.estimated_time} min
              </Badge>
            )}
          </div>

          <Button
            onClick={completeTask}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            size="lg"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Start This Task
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SuggestedTask;
