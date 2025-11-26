import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PushNotificationSetup from "@/components/PushNotificationSetup";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    cooking_time: 30,
    getting_ready_time: 45,
    travel_buffer_time: 15,
    wake_up_margin: 30,
    home_location: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setProfile({
        full_name: data.full_name || "",
        cooking_time: data.cooking_time || 30,
        getting_ready_time: data.getting_ready_time || 45,
        travel_buffer_time: data.travel_buffer_time || 15,
        wake_up_margin: data.wake_up_margin || 30,
        home_location: data.home_location || "",
      });
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        cooking_time: profile.cooking_time,
        getting_ready_time: profile.getting_ready_time,
        travel_buffer_time: profile.travel_buffer_time,
        wake_up_margin: profile.wake_up_margin,
        home_location: profile.home_location,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved successfully");
    }

    setSaving(false);
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
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your preferences</p>
        </div>

        {/* Push Notifications */}
        <PushNotificationSetup />

        {/* Profile Settings */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="location">Home Location</Label>
              <Input
                id="location"
                value={profile.home_location}
                onChange={(e) => setProfile({ ...profile, home_location: e.target.value })}
                placeholder="123 Main St, City"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for calculating travel time to events
              </p>
            </div>
          </div>
        </Card>

        {/* Routine Settings */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Daily Routine Times</h2>
          <p className="text-sm text-muted-foreground">
            Set your typical time requirements (in minutes)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cooking">Cooking & Eating</Label>
              <Input
                id="cooking"
                type="number"
                value={profile.cooking_time}
                onChange={(e) => setProfile({ ...profile, cooking_time: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="ready">Getting Ready</Label>
              <Input
                id="ready"
                type="number"
                value={profile.getting_ready_time}
                onChange={(e) => setProfile({ ...profile, getting_ready_time: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="buffer">Travel Buffer</Label>
              <Input
                id="buffer"
                type="number"
                value={profile.travel_buffer_time}
                onChange={(e) => setProfile({ ...profile, travel_buffer_time: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="margin">Wake-up Margin</Label>
              <Input
                id="margin"
                type="number"
                value={profile.wake_up_margin}
                onChange={(e) => setProfile({ ...profile, wake_up_margin: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}