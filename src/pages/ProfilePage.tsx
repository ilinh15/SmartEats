import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Database,
  DollarSign,
  Eye,
  FileText,
  HelpCircle,
  Info,
  Leaf,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  ShieldCheck,
  User,
  UtensilsCrossed,
} from "lucide-react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  BUDGET_PREFERENCES,
  DEFAULT_NOTIFICATION_SETTINGS,
  getAuthErrorMessage,
  isBudgetPreference,
  normalizeNotificationSettings,
  type BudgetPreference,
  type NotificationSettings,
} from "@/lib/authUtils";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const DIETARY_PREFERENCES = [
  "Halal",
  "Economy",
  "Gluten-Free",
  "Vegan",
  "Vegetarian",
  "Low Carb",
  "Dairy-Free",
  "Nut-Free",
  "Pescatarian",
  "Keto",
] as const;

const APP_VERSION = "0.0.0";

type DialogKey =
  | "account"
  | "dietary"
  | "budget"
  | "notifications"
  | "privacy"
  | "help"
  | null;

const PRIVACY_ITEMS = [
  ["Data Visibility", "Your profile and preferences are only visible to you.", Eye],
  ["Data Storage", "Your data is securely stored and encrypted in our cloud.", Database],
  ["Account Security", "Change your password anytime from Account Settings.", Lock],
  ["Terms of Service", "Read our terms and conditions for using SmartEats.", FileText],
  ["Privacy Policy", "Learn how we collect, use, and protect your information.", ShieldCheck],
] as const;

const HELP_ITEMS = [
  ["FAQs", "Find answers to commonly asked questions about SmartEats.", BookOpen],
  ["Contact Support", "Reach out to us via email at support@smarteats.app", MessageSquare],
  ["Live Chat", "Chat with our support team during business hours.", Phone],
  ["App Version", `SmartEats v${APP_VERSION}`, Info],
] as const;

const notificationItems: Array<{
  key: keyof NotificationSettings;
  title: string;
  description: string;
  icon: typeof Bell;
}> = [
  {
    key: "push",
    title: "Push Notifications",
    description: "Get notified about meal times and recommendations",
    icon: Bell,
  },
  {
    key: "email",
    title: "Email Notifications",
    description: "Receive weekly meal plan summaries",
    icon: Mail,
  },
  {
    key: "mealReminders",
    title: "Meal Reminders",
    description: "Reminders to plan your meals",
    icon: UtensilsCrossed,
  },
];

const getEnabledNotificationCount = (settings: NotificationSettings) =>
  Object.values(settings).filter(Boolean).length;

const formatPreferenceSummary = (preferences: string[]) =>
  preferences.length === 0
    ? "No preferences selected"
    : `${preferences.length} preference${preferences.length === 1 ? "" : "s"} selected`;

const formatNotificationSummary = (settings: NotificationSettings) => {
  const count = getEnabledNotificationCount(settings);
  return `${count} notification${count === 1 ? "" : "s"} enabled`;
};

const formatAccountSummary = (displayName: string, email: string) => {
  if (displayName && email) return `${displayName} - ${email}`;
  return displayName || email || "Profile details";
};

const ProfileMenuItem = ({
  icon: Icon,
  label,
  summary,
  onClick,
}: {
  icon: typeof User;
  label: string;
  summary: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-[24px] bg-card px-4 py-4 text-left shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-card"
  >
    <div className="flex items-start gap-3">
      <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-display font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs font-body text-muted-foreground">{summary}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-muted-foreground" />
  </button>
);

const SectionCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof User;
  title: string;
  description: string;
}) => (
  <div className="rounded-[24px] bg-accent/40 px-4 py-4">
    <div className="flex items-start gap-3">
      <Icon size={20} className="mt-0.5 text-muted-foreground" />
      <div>
        <p className="text-base font-body font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm font-body text-muted-foreground">{description}</p>
      </div>
    </div>
  </div>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const authClient = auth || getAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [budgetPreference, setBudgetPreference] = useState<BudgetPreference | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [activeDialog, setActiveDialog] = useState<DialogKey>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferencesDraft, setPreferencesDraft] = useState<string[]>([]);
  const [budgetDraft, setBudgetDraft] = useState<BudgetPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAccountName, setIsSavingAccountName] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const resetDrafts = () => {
    setDisplayNameDraft(displayName);
    setEmailDraft(email);
    setNewPassword("");
    setConfirmPassword("");
    setPreferencesDraft(preferences);
    setBudgetDraft(budgetPreference);
  };

  const closeDialog = () => {
    setActiveDialog(null);
    resetDrafts();
  };

  const openDialog = (dialog: Exclude<DialogKey, null>) => {
    resetDrafts();
    setActiveDialog(dialog);
  };

  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(authClient, async (user) => {
      if (!isActive) return;

      if (!user) {
        setUserId(null);
        setDisplayName("User");
        setEmail("");
        setPreferences([]);
        setBudgetPreference(null);
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const authEmail = user.email ?? "";
      const fallbackName = user.displayName || authEmail || "User";
      let nextName = fallbackName;
      let nextPreferences: string[] = [];
      let nextBudget: BudgetPreference | null = null;
      let nextNotifications = DEFAULT_NOTIFICATION_SETTINGS;

      if (db) {
        try {
          const userReference = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userReference);

          if (!isActive) return;

          if (userSnapshot.exists()) {
            const data = userSnapshot.data();
            if (typeof data.username === "string" && data.username.trim().length > 0) {
              nextName = data.username.trim();
            }

            nextPreferences = Array.isArray(data.preferences)
              ? data.preferences.filter(
                  (value): value is string =>
                    typeof value === "string" &&
                    DIETARY_PREFERENCES.includes(value as (typeof DIETARY_PREFERENCES)[number]),
                )
              : [];
            nextBudget =
              typeof data.budgetPreference === "string" && isBudgetPreference(data.budgetPreference)
                ? data.budgetPreference
                : null;
            nextNotifications = normalizeNotificationSettings(
              data.notificationSettings as Partial<NotificationSettings> | undefined,
            );

            if (authEmail && data.email !== authEmail) {
              await setDoc(
                userReference,
                { email: authEmail, updatedAt: new Date().toISOString() },
                { merge: true },
              );
            }
          } else if (authEmail) {
            await setDoc(
              userReference,
              {
                username: fallbackName,
                email: authEmail,
                preferences: [],
                budgetPreference: null,
                notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
                updatedAt: new Date().toISOString(),
              },
              { merge: true },
            );
          }
        } catch (error) {
          console.error("Failed to load profile data:", error);
        }
      }

      if (!isActive) return;

      setUserId(user.uid);
      setDisplayName(nextName);
      setEmail(authEmail);
      setPreferences(nextPreferences);
      setBudgetPreference(nextBudget);
      setNotificationSettings(nextNotifications);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [authClient]);

  useEffect(() => {
    resetDrafts();
  }, [displayName, email, preferences, budgetPreference]);

  const handleLogout = async () => {
    try {
      await signOut(authClient);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Could not log out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const requireProfileContext = () => {
    const currentUser = authClient.currentUser;

    if (!currentUser || !userId || !db) {
      toast({
        title: "Profile unavailable",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return null;
    }

    return { currentUser, userReference: doc(db, "users", userId) };
  };

  const handleSaveDisplayName = async () => {
    const context = requireProfileContext();
    const trimmedName = displayNameDraft.trim();

    if (!context || !trimmedName) {
      if (!trimmedName) {
        toast({
          title: "Display name required",
          description: "Enter a display name before saving.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsSavingAccountName(true);
    try {
      await updateProfile(context.currentUser, { displayName: trimmedName });
      await setDoc(
        context.userReference,
        { username: trimmedName, email, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      setDisplayName(trimmedName);
      toast({
        title: "Display name updated",
        description: "Your profile name has been saved.",
      });
    } catch (error) {
      console.error("Failed to update display name:", error);
      toast({
        title: "Could not update display name",
        description:
          error instanceof Error
            ? getAuthErrorMessage((error as { code?: string }).code || "")
            : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAccountName(false);
    }
  };

  const handleSaveEmail = async () => {
    const context = requireProfileContext();
    const trimmedEmail = emailDraft.trim();

    if (!context || !trimmedEmail || trimmedEmail === email) {
      if (trimmedEmail === email) {
        toast({
          title: "No changes detected",
          description: "Enter a different email address to update it.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsSavingEmail(true);
    try {
      await verifyBeforeUpdateEmail(context.currentUser, trimmedEmail);
      toast({
        title: "Confirmation sent",
        description: "Check your new email address to confirm the change.",
      });
      setEmailDraft(email);
    } catch (error) {
      console.error("Failed to update email:", error);
      const errorCode =
        error instanceof Error ? (error as { code?: string }).code || "" : "";
      toast({
        title: "Could not update email",
        description: getAuthErrorMessage(errorCode) || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    const context = requireProfileContext();
    if (!context) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(context.currentUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      console.error("Failed to update password:", error);
      const errorCode =
        error instanceof Error ? (error as { code?: string }).code || "" : "";
      toast({
        title: "Could not update password",
        description: getAuthErrorMessage(errorCode) || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const togglePreferenceDraft = (preference: string) => {
    setPreferencesDraft((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference],
    );
  };

  const handleSavePreferences = async () => {
    const context = requireProfileContext();
    if (!context) return;

    setIsSavingPreferences(true);
    try {
      await setDoc(
        context.userReference,
        { preferences: preferencesDraft, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      setPreferences(preferencesDraft);
      toast({
        title: "Preferences saved",
        description: "Your dietary preferences have been updated.",
      });
      closeDialog();
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast({
        title: "Could not save preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleSaveBudget = async () => {
    const context = requireProfileContext();
    if (!context) return;

    setIsSavingBudget(true);
    try {
      await setDoc(
        context.userReference,
        { budgetPreference: budgetDraft, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      setBudgetPreference(budgetDraft);
      toast({
        title: "Budget saved",
        description: "Your budget preference has been updated.",
      });
      closeDialog();
    } catch (error) {
      console.error("Failed to save budget preference:", error);
      toast({
        title: "Could not save budget",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleNotificationToggle = async (
    key: keyof NotificationSettings,
    checked: boolean,
  ) => {
    const context = requireProfileContext();
    if (!context) return;

    const previousSettings = notificationSettings;
    const nextSettings = { ...notificationSettings, [key]: checked };
    setNotificationSettings(nextSettings);

    try {
      await setDoc(
        context.userReference,
        { notificationSettings: nextSettings, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      setNotificationSettings(previousSettings);
      toast({
        title: "Could not update notifications",
        description: "Your change was not saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="text-sm font-body text-muted-foreground">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div
        className="relative overflow-hidden rounded-b-[32px] px-5 pb-8 pt-12"
        style={{ background: "var(--hero-gradient)" }}
      >
        <div className="absolute right-[-30px] top-6 h-40 w-40 rounded-full bg-primary/5 animate-pulse-soft" />

        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted shadow-card">
            <User size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground">
              {displayName}
            </h1>
            <p className="text-sm font-body text-muted-foreground">
              {email || "Home cook & foodie"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 px-5">
        <ProfileMenuItem
          icon={User}
          label="Account Settings"
          summary={formatAccountSummary(displayName, email)}
          onClick={() => openDialog("account")}
        />
        <ProfileMenuItem
          icon={Leaf}
          label="Dietary Preferences"
          summary={formatPreferenceSummary(preferences)}
          onClick={() => openDialog("dietary")}
        />
        <ProfileMenuItem
          icon={DollarSign}
          label="Budget Preference"
          summary={budgetPreference ?? "Not set"}
          onClick={() => openDialog("budget")}
        />
        <ProfileMenuItem
          icon={Bell}
          label="Notifications"
          summary={formatNotificationSummary(notificationSettings)}
          onClick={() => openDialog("notifications")}
        />
        <ProfileMenuItem
          icon={Shield}
          label="Privacy & Security"
          summary="Manage how your data is handled"
          onClick={() => openDialog("privacy")}
        />
        <ProfileMenuItem
          icon={HelpCircle}
          label="Help & Support"
          summary="FAQs, contact details, and app version"
          onClick={() => openDialog("help")}
        />

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 text-sm font-body font-semibold text-white shadow-lg shadow-orange-500/20 transition duration-200 ease-out hover:bg-orange-600"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>

      <Dialog
        open={activeDialog === "account"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-[560px] rounded-[32px] border-none p-0">
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">
                Account Settings
              </DialogTitle>
              <DialogDescription className="mt-2 font-body text-muted-foreground">
                Update your profile details and security settings.
              </DialogDescription>
            </div>

            <div className="space-y-4 border-b border-border pb-6">
              <div className="flex items-center gap-2 text-base font-body font-semibold text-foreground">
                <User size={18} />
                Display Name
              </div>
              <div className="flex items-start gap-3">
                <Input
                  value={displayNameDraft}
                  onChange={(event) => setDisplayNameDraft(event.target.value)}
                  aria-label="Display Name"
                  className="h-12 rounded-2xl border-border bg-accent/30 px-4"
                />
                <button
                  type="button"
                  onClick={handleSaveDisplayName}
                  aria-label="Save display name"
                  disabled={isSavingAccountName}
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  {isSavingAccountName ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div className="space-y-4 border-b border-border pb-6">
              <div className="flex items-center gap-2 text-base font-body font-semibold text-foreground">
                <Mail size={18} />
                Email Address
              </div>
              <div className="flex items-start gap-3">
                <Input
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  aria-label="Email Address"
                  className="h-12 rounded-2xl border-border bg-accent/30 px-4"
                />
                <button
                  type="button"
                  onClick={handleSaveEmail}
                  aria-label="Save email address"
                  disabled={isSavingEmail}
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  {isSavingEmail ? "Sending..." : "Save"}
                </button>
              </div>
              <p className="text-sm font-body text-muted-foreground">
                A confirmation link will be sent to your new email.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base font-body font-semibold text-foreground">
                <Lock size={18} />
                Change Password
              </div>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-label="New Password"
                placeholder="New password"
                className="h-12 rounded-2xl border-border bg-accent/30 px-4"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-label="Confirm New Password"
                placeholder="Confirm new password"
                className="h-12 rounded-2xl border-border bg-accent/30 px-4"
              />
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isSavingPassword}
                className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {isSavingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "dietary"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-[600px] rounded-[32px] border-none p-0">
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <DialogTitle className="flex items-center gap-2 font-display text-[2rem] font-semibold text-foreground">
                <Leaf size={24} className="text-secondary" />
                Dietary Preferences
              </DialogTitle>
              <DialogDescription className="mt-2 font-body text-muted-foreground">
                Choose the food preferences we should keep in mind.
              </DialogDescription>
            </div>

            <div className="flex flex-wrap gap-3">
              {DIETARY_PREFERENCES.map((preference) => {
                const active = preferencesDraft.includes(preference);

                return (
                  <button
                    key={preference}
                    type="button"
                    onClick={() => togglePreferenceDraft(preference)}
                    className={cn(
                      "rounded-full px-5 py-2.5 text-sm font-body font-semibold transition-all",
                      active
                        ? "bg-orange-500 text-white shadow-elevated"
                        : "bg-accent/50 text-foreground hover:bg-accent",
                    )}
                  >
                    {preference}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={isSavingPreferences}
              className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {isSavingPreferences ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "budget"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-[560px] rounded-[32px] border-none p-0">
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <DialogTitle className="flex items-center gap-2 font-display text-[2rem] font-semibold text-foreground">
                <DollarSign size={24} className="text-secondary" />
                Budget Preference
              </DialogTitle>
              <DialogDescription className="mt-2 font-body text-muted-foreground">
                Choose the price range that fits your meal planning style.
              </DialogDescription>
            </div>

            <div className="flex flex-wrap gap-3">
              {BUDGET_PREFERENCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBudgetDraft(option)}
                  className={cn(
                    "rounded-full px-5 py-2.5 text-sm font-body font-semibold transition-all",
                    budgetDraft === option
                      ? "bg-orange-500 text-white shadow-elevated"
                      : "bg-accent/50 text-foreground hover:bg-accent",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveBudget}
              disabled={isSavingBudget}
              className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {isSavingBudget ? "Saving..." : "Save Budget"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "notifications"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-[560px] rounded-[32px] border-none p-0">
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">
                Notifications
              </DialogTitle>
              <DialogDescription className="mt-2 font-body text-muted-foreground">
                Control how SmartEats keeps you updated.
              </DialogDescription>
            </div>

            <div className="space-y-4">
              {notificationItems.map(({ key, title, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-[24px] bg-accent/40 px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <Icon size={20} className="mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-base font-body font-semibold text-foreground">
                        {title}
                      </p>
                      <p className="mt-1 text-sm font-body text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings[key]}
                    onCheckedChange={(checked) =>
                      handleNotificationToggle(key, checked)
                    }
                    aria-label={title}
                  />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "privacy"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-[620px] rounded-[32px] border-none p-0">
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">
                Privacy & Security
              </DialogTitle>
              <DialogDescription className="mt-2 font-body text-muted-foreground">
                Review how SmartEats handles your privacy and account security.
              </DialogDescription>
            </div>

            <div className="space-y-4">
              {PRIVACY_ITEMS.map(([title, description, icon]) => (
                <SectionCard
                  key={title}
                  icon={icon}
                  title={title}
                  description={description}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "help"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-[620px] rounded-[32px] border-none p-0">
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">
                Help & Support
              </DialogTitle>
              <DialogDescription className="mt-2 font-body text-muted-foreground">
                Support details and quick references for using SmartEats.
              </DialogDescription>
            </div>

            <div className="space-y-4">
              {HELP_ITEMS.map(([title, description, icon]) => (
                <SectionCard
                  key={title}
                  icon={icon}
                  title={title}
                  description={description}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
