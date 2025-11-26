import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smile, Meh, Frown } from "lucide-react";

interface MoodSelectorProps {
  onMoodSelect: (mood: number) => void;
}

const MoodSelector = ({ onMoodSelect }: MoodSelectorProps) => {
  const [hoveredMood, setHoveredMood] = useState<number | null>(null);

  const moods = [
    { value: 1, label: "Low Energy", icon: Frown, color: "text-red-500" },
    { value: 2, label: "Tired", icon: Frown, color: "text-orange-500" },
    { value: 3, label: "Neutral", icon: Meh, color: "text-yellow-500" },
    { value: 4, label: "Good", icon: Smile, color: "text-green-500" },
    { value: 5, label: "Energized", icon: Smile, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4">
        {moods.map((mood) => {
          const Icon = mood.icon;
          const isHovered = hoveredMood === mood.value;
          
          return (
            <button
              key={mood.value}
              onClick={() => onMoodSelect(mood.value)}
              onMouseEnter={() => setHoveredMood(mood.value)}
              onMouseLeave={() => setHoveredMood(null)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-110 ${
                isHovered
                  ? "border-primary bg-primary/10 shadow-medium"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Icon className={`w-8 h-8 ${mood.color}`} />
              <span className="text-xs font-medium">{mood.value}</span>
            </button>
          );
        })}
      </div>
      
      {hoveredMood && (
        <p className="text-center text-sm text-muted-foreground animate-fade-in">
          {moods.find((m) => m.value === hoveredMood)?.label}
        </p>
      )}
    </div>
  );
};

export default MoodSelector;
