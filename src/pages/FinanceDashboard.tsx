import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Trash2, DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWishlistDialog, setShowWishlistDialog] = useState(false);

  const [newRecord, setNewRecord] = useState({
    type: "income",
    amount: "",
    category: "",
    description: "",
  });

  const [newWishlistItem, setNewWishlistItem] = useState({
    name: "",
    cost: "",
    priority: 3,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        loadData();
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

  const loadData = async () => {
    try {
      const [recordsRes, wishlistRes] = await Promise.all([
        supabase.from("financial_records").select("*").order("date", { ascending: false }),
        supabase.from("wishlist_items").select("*").eq("purchased", false).order("priority", { ascending: false }),
      ]);

      if (recordsRes.error) throw recordsRes.error;
      if (wishlistRes.error) throw wishlistRes.error;

      setRecords(recordsRes.data || []);
      setWishlist(wishlistRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from("financial_records").insert({
        user_id: user.id,
        type: newRecord.type as 'income' | 'expense',
        amount: parseFloat(newRecord.amount),
        category: newRecord.category,
        description: newRecord.description,
      });

      if (error) throw error;

      toast.success("Record added");
      setShowAddDialog(false);
      setNewRecord({ type: "income", amount: "", category: "", description: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const addWishlistItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from("wishlist_items").insert({
        user_id: user.id,
        name: newWishlistItem.name,
        cost: parseFloat(newWishlistItem.cost) as any,
        priority: newWishlistItem.priority,
      });

      if (error) throw error;

      toast.success("Item added to wishlist");
      setShowWishlistDialog(false);
      setNewWishlistItem({ name: "", cost: "", priority: 3 });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase.from("financial_records").delete().eq("id", id);
      if (error) throw error;
      toast.success("Record deleted");
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteWishlistItem = async (id: string) => {
    try {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
      if (error) throw error;
      toast.success("Item removed");
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const calculateFinances = () => {
    const income = records.filter(r => r.type === "income").reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const expenses = records.filter(r => r.type === "expense").reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expenses, savings, savingsRate };
  };

  const calculateWishlistTimeline = () => {
    const { savings } = calculateFinances();
    const monthlySavings = savings;

    return wishlist.map(item => ({
      ...item,
      monthsNeeded: monthlySavings > 0 ? Math.ceil(parseFloat(item.cost) / monthlySavings) : Infinity,
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const { income, expenses, savings, savingsRate } = calculateFinances();
  const wishlistWithTimeline = calculateWishlistTimeline();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Finance Dashboard
            </h1>
            <p className="text-muted-foreground">Track income, expenses, and savings goals</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="text-2xl font-bold">₹{income.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-2xl font-bold">₹{expenses.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Savings</p>
                <p className="text-2xl font-bold">₹{savings.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent">
                <AlertCircle className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Savings Rate</p>
                <p className="text-2xl font-bold">{savingsRate.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Records */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Transactions</h2>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={newRecord.type} onValueChange={(v) => setNewRecord({ ...newRecord, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={newRecord.amount}
                        onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={newRecord.category}
                        onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={newRecord.description}
                        onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                      />
                    </div>
                    <Button onClick={addRecord} className="w-full">Add Transaction</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{record.category}</p>
                    <p className="text-sm text-muted-foreground">{record.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${record.type === "income" ? "text-green-500" : "text-red-500"}`}>
                      {record.type === "income" ? "+" : "-"}₹{parseFloat(record.amount).toFixed(2)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => deleteRecord(record.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Wishlist */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Wishlist</h2>
              <Dialog open={showWishlistDialog} onOpenChange={setShowWishlistDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Wishlist Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Item Name</Label>
                      <Input
                        value={newWishlistItem.name}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Cost</Label>
                      <Input
                        type="number"
                        value={newWishlistItem.cost}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, cost: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Priority (1-5)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={newWishlistItem.priority}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, priority: parseInt(e.target.value) })}
                      />
                    </div>
                    <Button onClick={addWishlistItem} className="w-full">Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {wishlistWithTimeline.map((item) => (
                <div key={item.id} className="p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">₹{parseFloat(item.cost).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Priority: {item.priority}/5 • 
                        {item.monthsNeeded === Infinity ? " Cannot afford" : ` ${item.monthsNeeded} months to save`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteWishlistItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}