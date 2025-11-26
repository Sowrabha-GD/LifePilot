import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, CheckCircle2, BarChart3, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-primary mb-8 shadow-medium animate-fade-in">
          <Compass className="w-10 h-10 text-primary-foreground" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
          Navigate Your Day<br />with <span className="text-primary">Intention</span>
        </h1>
        
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
          LifePilot helps you plan your day based on your mood and energy levels, 
          ensuring you tackle the right tasks at the right time.
        </p>
        
        <div className="flex gap-4 justify-center animate-fade-in" style={{ animationDelay: "300ms" }}>
          <Button size="lg" onClick={() => navigate("/auth")} className="shadow-medium">
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all animate-slide-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Mood-Based Tasks</h3>
            <p className="text-muted-foreground">
              Get personalized task recommendations based on your current mood and energy level
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all animate-slide-in" style={{ animationDelay: "100ms" }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 mb-4">
              <BarChart3 className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Smart Scheduling</h3>
            <p className="text-muted-foreground">
              Plan your routines with intelligent time calculations for daily activities
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all animate-slide-in" style={{ animationDelay: "200ms" }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Day Planning</h3>
            <p className="text-muted-foreground">
              Organize your tasks with priority, difficulty ratings, and time estimates
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto p-12 rounded-3xl bg-gradient-primary shadow-medium">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            Ready to Take Control of Your Day?
          </h2>
          <p className="text-lg mb-8 text-primary-foreground/90">
            Start planning smarter, not harder. Join LifePilot today.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="shadow-medium"
          >
            Create Your Account
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
