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
}

const TaskList = ({ mood, onTasksChange }: TaskListProps) => {
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
  }, []);

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
  };

  const sortTasksByMood = (tasks: Task[], mood: number) => {
    return [...tasks].sort((a, b) => {
      // Low mood (1-2): Show easiest tasks first
      if (mood <= 2) {
        return a.difficulty - b.difficulty;
      }
      // High mood (4-5): Show difficult/high-priority tasks first
      if (mood >= 4) {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const scoreA = priorityWeight[a.priority] + a.difficulty;
        const scoreB = priorityWeight[b.priority] + b.difficulty;
        return scoreB - scoreA;
      }
      // Neutral (3): Balanced ordering
      return 0;
    });
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
