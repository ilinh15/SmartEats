import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  User, Leaf, LogOut, ChevronRight, Bell, Shield, HelpCircle,
  Settings, Pencil, X, Lock, Mail, MessageSquare, FileText, Eye, Database, Trash2,
  Phone, Info, BookOpen, ExternalLink, BellRing, BellOff, Volume2, DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PREFERENCE_OPTIONS = [
  "Halal", "Economy", "Gluten-Free", "Vegan", "Vegetarian",
  "Low Carb", "Dairy-Free", "Nut-Free", "Pescatarian", "Keto",
];

const BUDGET_OPTIONS = ["Budget-friendly", "Moderate", "Premium"];

type DialogType = "settings" | "notifications" | "privacy" | "help" | null;

const ProfilePage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("User");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);

  // Settings state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // Notification prefs (local UI only)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [mealReminders, setMealReminders] = useState(true);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = session.user;
        setUserId(user.id);
        const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
        setUsername(displayName);
        setEditName(displayName);
        setEditEmail(user.email || "");

        // Load preferences
        const { data } = await supabase
          .from("user_dietary_preferences")
          .select("preference")
          .eq("user_id", user.id);
        if (data) {
          const budgetPref = data.find((d) => BUDGET_OPTIONS.includes(d.preference));
          if (budgetPref) setSelectedBudget(budgetPref.preference);
          setSelectedPreferences(data.map((d) => d.preference).filter((p) => !BUDGET_OPTIONS.includes(p)));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const togglePreference = (pref: string) => {
    setSelectedPreferences((cur) =>
      cur.includes(pref) ? cur.filter((p) => p !== pref) : [...cur, pref]
    );
  };

  const handleSavePreferences = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase.from("user_dietary_preferences").delete().eq("user_id", userId);
    const allPrefs = [...selectedPreferences, ...(selectedBudget ? [selectedBudget] : [])];
    if (allPrefs.length > 0) {
      await supabase.from("user_dietary_preferences").insert(
        allPrefs.map((p) => ({ user_id: userId, preference: p }))
      );
    }
    setSaving(false);
    setEditingPrefs(false);
    setEditingBudget(false);
    toast.success("Preferences saved successfully!");
  };

  const handleUpdateName = async () => {
    if (!editName.trim()) return;
    setSettingsSaving(true);
    setSettingsMsg(null);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: editName.trim() },
    });
    if (error) {
      toast.error("Failed to update name.");
    } else {
      setUsername(editName.trim());
      if (userId) {
        await supabase.from("profiles").update({ display_name: editName.trim() }).eq("user_id", userId);
      }
      toast.success("Name updated successfully!");
    }
    setSettingsSaving(false);
  };

  const handleUpdatePassword = async () => {
    setSettingsMsg(null);
    if (newPassword.length < 6) {
      setSettingsMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSettingsMsg("Passwords do not match.");
      return;
    }
    setSettingsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Failed to update password.");
    } else {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSettingsSaving(false);
  };
  const handleUpdateEmail = async () => {
    if (!editEmail.trim() || !editEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSettingsSaving(true);
    const { error } = await supabase.auth.updateUser({ email: editEmail.trim() });
    if (error) {
      toast.error(error.message || "Failed to update email.");
    } else {
      toast.success("Email update requested! Check your new email for a confirmation link.");
    }
    setSettingsSaving(false);
  };

  const openDialog = (type: DialogType) => {
    setActiveDialog(type);
    setSettingsMsg(null);
  };

  return (
    <div className="pb-20 min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden rounded-b-[32px] px-5 pt-12 pb-8" style={{ background: "var(--hero-gradient)" }}>
        <div className="absolute top-6 right-[-30px] w-40 h-40 rounded-full bg-primary/5 animate-pulse-soft" />
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shadow-card">
            <User size={32} className="text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-display font-semibold text-foreground">{username}</h1>
            <p className="text-sm text-muted-foreground font-body">Home cook & foodie</p>
          </div>
          <button onClick={() => openDialog("settings")} className="p-2 rounded-full bg-card/80 shadow-soft">
            <Settings size={20} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-5 mt-6">
        {statusMessage && (
          <Alert className="mb-4 border-secondary/30 bg-secondary/10 text-foreground shadow-sm">
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        {/* Dietary Preferences */}
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
              <Leaf size={18} className="text-secondary" />
              Dietary Preferences
            </h2>
            <button onClick={() => setEditingPrefs(!editingPrefs)} className="text-xs font-medium text-primary flex items-center gap-1">
              <Pencil size={14} />
              {editingPrefs ? "Cancel" : "Edit"}
            </button>
          </div>

          {!editingPrefs ? (
            <div className="flex flex-wrap gap-2">
              {selectedPreferences.length > 0 ? selectedPreferences.map((pref) => (
                <span key={pref} className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/15 text-secondary border border-secondary/20">
                  {pref}
                </span>
              )) : (
                <p className="text-sm text-muted-foreground">No preferences set. Tap Edit to add.</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {PREFERENCE_OPTIONS.map((pref) => {
                  const active = selectedPreferences.includes(pref);
                  return (
                    <motion.button
                      key={pref}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => togglePreference(pref)}
                      className={`px-4 py-2 rounded-full text-xs font-medium font-body transition-all ${
                        active
                          ? "bg-secondary text-secondary-foreground shadow-elevated"
                          : "bg-muted text-foreground hover:bg-accent"
                      }`}
                    >
                      {pref}
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="w-full mt-4 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </>
          )}
        </div>

        {/* Budget Preference */}
        <div className="bg-card rounded-2xl p-4 shadow-soft mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
              <DollarSign size={18} className="text-secondary" />
              Budget Preference
            </h2>
            <button onClick={() => setEditingBudget(!editingBudget)} className="text-xs font-medium text-primary flex items-center gap-1">
              <Pencil size={14} />
              {editingBudget ? "Cancel" : "Edit"}
            </button>
          </div>

          {!editingBudget ? (
            <div className="flex flex-wrap gap-2">
              {selectedBudget ? (
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/15 text-secondary border border-secondary/20">
                  {selectedBudget}
                </span>
              ) : (
                <p className="text-sm text-muted-foreground">No budget set. Tap Edit to add.</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map((budget) => {
                  const active = selectedBudget === budget;
                  return (
                    <motion.button
                      key={budget}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedBudget(active ? "" : budget)}
                      className={`px-4 py-2 rounded-full text-xs font-medium font-body transition-all ${
                        active
                          ? "bg-secondary text-secondary-foreground shadow-elevated"
                          : "bg-muted text-foreground hover:bg-accent"
                      }`}
                    >
                      {budget}
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="w-full mt-4 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Budget"}
              </button>
            </>
          )}
        </div>

        {/* Menu Items */}
        <div className="mt-6 space-y-2">
          {[
            { label: "Notifications", icon: Bell, dialog: "notifications" as DialogType },
            { label: "Privacy & Security", icon: Shield, dialog: "privacy" as DialogType },
            { label: "Help & Support", icon: HelpCircle, dialog: "help" as DialogType },
          ].map(({ label, icon: Icon, dialog }) => (
            <button
              key={label}
              onClick={() => openDialog(dialog)}
              className="w-full flex items-center justify-between bg-card p-4 rounded-2xl shadow-soft hover:bg-accent/50 transition"
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-muted-foreground" />
                <span className="text-sm font-body text-foreground">{label}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleLogout}
          className="w-full mt-8 flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground rounded-full text-sm font-body font-semibold shadow-lg shadow-primary/20 transition hover:bg-primary/90"
        >
          <LogOut size={16} />
          Log Out
        </motion.button>
      </div>

      {/* Dialog Overlay */}
      <AnimatePresence>
        {activeDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
            onClick={() => setActiveDialog(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto shadow-elevated"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-display font-semibold text-foreground">
                  {activeDialog === "settings" && "Account Settings"}
                  {activeDialog === "notifications" && "Notifications"}
                  {activeDialog === "privacy" && "Privacy & Security"}
                  {activeDialog === "help" && "Help & Support"}
                </h2>
                <button onClick={() => setActiveDialog(null)} className="p-1.5 rounded-full hover:bg-muted">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {settingsMsg && (
                <Alert className="mb-4 border-secondary/30 bg-secondary/10 text-foreground">
                  <AlertDescription>{settingsMsg}</AlertDescription>
                </Alert>
              )}

              {/* Settings Dialog */}
              {activeDialog === "settings" && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <User size={16} /> Display Name
                    </label>
                    <div className="flex gap-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" />
                      <button
                        onClick={handleUpdateName}
                        disabled={settingsSaving}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Mail size={16} /> Email Address
                    </label>
                    <div className="flex gap-2">
                      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Your email" type="email" />
                      <button
                        onClick={handleUpdateEmail}
                        disabled={settingsSaving}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">A confirmation link will be sent to your new email.</p>
                  </div>

                  <div className="border-t border-border pt-4">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                      <Lock size={16} /> Change Password
                    </label>
                    <div className="space-y-3">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                      />
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                      <button
                        onClick={handleUpdatePassword}
                        disabled={settingsSaving}
                        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Dialog */}
              {activeDialog === "notifications" && (
                <div className="space-y-4">
                  {[
                    { label: "Push Notifications", desc: "Get notified about meal times and recommendations", icon: BellRing, value: pushEnabled, set: setPushEnabled },
                    { label: "Email Notifications", desc: "Receive weekly meal plan summaries", icon: Mail, value: emailNotifs, set: setEmailNotifs },
                    { label: "Meal Reminders", desc: "Reminders to plan your meals", icon: Volume2, value: mealReminders, set: setMealReminders },
                  ].map(({ label, desc, icon: Icon, value, set }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <Switch checked={value} onCheckedChange={set} />
                    </div>
                  ))}
                </div>
              )}

              {/* Privacy & Security Dialog */}
              {activeDialog === "privacy" && (
                <div className="space-y-4">
                  {[
                    { icon: Eye, title: "Data Visibility", desc: "Your profile and preferences are only visible to you." },
                    { icon: Database, title: "Data Storage", desc: "Your data is securely stored and encrypted in our cloud." },
                    { icon: Lock, title: "Account Security", desc: "Change your password anytime from Account Settings." },
                    { icon: FileText, title: "Terms of Service", desc: "Read our terms and conditions for using SmartEats." },
                    { icon: Shield, title: "Privacy Policy", desc: "Learn how we collect, use, and protect your information." },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex gap-3 p-3 rounded-xl bg-muted/50">
                      <Icon size={18} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Help & Support Dialog */}
              {activeDialog === "help" && (
                <div className="space-y-4">
                  {[
                    { icon: BookOpen, title: "FAQs", desc: "Find answers to commonly asked questions about SmartEats." },
                    { icon: MessageSquare, title: "Contact Support", desc: "Reach out to us via email at support@smarteats.app" },
                    { icon: Phone, title: "Live Chat", desc: "Chat with our support team during business hours." },
                    { icon: Info, title: "App Version", desc: "SmartEats v1.0.0" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex gap-3 p-3 rounded-xl bg-muted/50">
                      <Icon size={18} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
