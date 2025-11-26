import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Clock } from "lucide-react";
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

interface TaskListProps {
  mood: number | null;
  onTasksChange: () => void;
  refreshKey?: number;
  onStatsUpdate?: (focusCount: number, totalTime: number) => void;
}

const TaskList = ({ mood, onTasksChange, refreshKey, onStatsUpdate }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshKey]);

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch tasks",
      });
      return;
    }

    // Sort tasks based on mood
    let sortedTasks = data || [];
    if (mood) {
      sortedTasks = sortTasksByMood(sortedTasks, mood);
    }

    setTasks(sortedTasks);
    setLoading(false);

    // Calculate and report stats based on displayed (mood-filtered) tasks
    const focusCount = sortedTasks.length;
    const totalTimeMinutes = sortedTasks.reduce((sum, task) => sum + (task.estimated_time || 0), 0);
    const totalTimeHours = Math.round(totalTimeMinutes / 60 * 10) / 10; // Round to 1 decimal place

    if (onStatsUpdate) {
      onStatsUpdate(focusCount, totalTimeHours);
    }
  };

  const sortTasksByMood = (tasks: Task[], mood: number) => {
    const incompleteTasks = tasks.filter(task => !task.completed);
    
    // Filter tasks by difficulty level suitable for mood
    let suitableTasks = incompleteTasks;
    
    if (mood <= 2) {
      // Low mood (1-2): Show only easy/medium tasks (difficulty 1-3)
      suitableTasks = incompleteTasks.filter(task => task.difficulty <= 3);
      // Sort by difficulty (easiest first)
      return suitableTasks.sort((a, b) => a.difficulty - b.difficulty);
    } else if (mood === 3) {
      // Neutral mood (3): Show all tasks, sort by balanced criteria
      return incompleteTasks.sort((a, b) => {
        // Sort by priority first, then by difficulty
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const scoreA = priorityWeight[a.priority] * 10 + a.difficulty;
        const scoreB = priorityWeight[b.priority] * 10 + b.difficulty;
        return scoreB - scoreA;
      });
    } else {
      // High mood (4-5): Show all tasks including hard ones, prioritize high-priority and difficult tasks
      return incompleteTasks.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const scoreA = priorityWeight[a.priority] * 10 + a.difficulty;
        const scoreB = priorityWeight[b.priority] * 10 + b.difficulty;
        return scoreB - scoreA;
      });
    }
  };

  const toggleComplete = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ 
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null
      })
      .eq("id", taskId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task",
      });
    } else {
      // Immediately refetch to update UI and stats
      await fetchTasks();
      onTasksChange();
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete task",
      });
    } else {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      // Immediately refetch to update UI and stats
      await fetchTasks();
      onTasksChange();
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

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    if (mood && mood <= 2) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No easy tasks available right now.</p>
          <p className="text-sm text-muted-foreground">Try adding some simple tasks or adjusting your mood if you're ready for more challenging ones.</p>
        </div>
      );
    }
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No tasks yet. Start by adding your first task!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:shadow-soft transition-all animate-slide-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => toggleComplete(task.id, task.completed)}
            className="mt-1"
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-medium ${
                  task.completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
                <Badge variant="outline">Difficulty: {task.difficulty}/5</Badge>
              </div>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            {task.estimated_time && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{task.estimated_time} min</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteTask(task.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
