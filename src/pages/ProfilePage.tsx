import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
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
  type LucideIcon,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  BUDGET_PREFERENCES,
  DEFAULT_NOTIFICATION_SETTINGS,
  getAuthErrorMessage,
  isBudgetPreference,
  isValidEmail,
  normalizeNotificationSettings,
  validatePasswordStrength,
  type BudgetPreference,
  type NotificationSettings,
} from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const PREFERENCE_OPTIONS = [
  "Halal",
  "Gluten-Free",
  "Vegan",
  "Vegetarian",
  "Low Carb",
  "Dairy-Free",
  "Nut-Free",
  "Pescatarian",
  "Keto",
] as const;

const APP_VERSION_LABEL = "SmartEats v1.0.0";

const PREFERENCE_ALIASES: Record<string, (typeof PREFERENCE_OPTIONS)[number]> = {
  Halal: "Halal",
  "Gluten-Free": "Gluten-Free",
  "Gluten-free": "Gluten-Free",
  Vegan: "Vegan",
  Vegetarian: "Vegetarian",
  "Low Carb": "Low Carb",
  "Low-carb": "Low Carb",
  "Dairy-Free": "Dairy-Free",
  "Nut-Free": "Nut-Free",
  Pescatarian: "Pescatarian",
  Keto: "Keto",
};

type PreferenceOption = (typeof PREFERENCE_OPTIONS)[number];

type DialogKey = "account" | "dietary" | "budget" | "notifications" | "privacy" | "help" | null;

type ProfileState = {
  username: string;
  email: string;
  preferences: PreferenceOption[];
  budgetPreference: BudgetPreference | null;
  notificationSettings: NotificationSettings;
};

type AccountDraft = {
  displayName: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
};

type SaveState = {
  displayName: boolean;
  email: boolean;
  password: boolean;
  preferences: boolean;
  budget: boolean;
};

type MenuCardProps = {
  icon: LucideIcon;
  title: string;
  summary: ReactNode;
  onClick: () => void;
};

type DetailItemProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const DEFAULT_PROFILE: ProfileState = {
  username: "User",
  email: "",
  preferences: [],
  budgetPreference: null,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
};

const DEFAULT_SAVE_STATE: SaveState = {
  displayName: false,
  email: false,
  password: false,
  preferences: false,
  budget: false,
};

const normalizePreferences = (value: unknown): PreferenceOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<PreferenceOption[]>((accumulator, item) => {
    if (typeof item !== "string") {
      return accumulator;
    }

    const mappedValue = PREFERENCE_ALIASES[item];
    if (mappedValue && !accumulator.includes(mappedValue)) {
      accumulator.push(mappedValue);
    }

    return accumulator;
  }, []);
};

const deriveBudgetPreference = (value: unknown, preferences: unknown): BudgetPreference | null => {
  if (typeof value === "string" && isBudgetPreference(value)) {
    return value;
  }

  if (Array.isArray(preferences) && preferences.includes("Economy")) {
    return "Budget-friendly";
  }

  return null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return getAuthErrorMessage(error.code);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const buildAccountDraft = (profile: ProfileState): AccountDraft => ({
  displayName: profile.username,
  email: profile.email,
  newPassword: "",
  confirmPassword: "",
});

const MenuCard = ({ icon: Icon, title, summary, onClick }: MenuCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-[24px] bg-card px-4 py-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-full bg-muted p-2">
          <Icon size={18} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <div className="mt-1 text-xs text-muted-foreground">{summary}</div>
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </div>
  </button>
);

const DetailItem = ({ icon: Icon, title, description }: DetailItemProps) => (
  <div className="flex items-start gap-3 rounded-[24px] bg-muted/60 px-4 py-4">
    <Icon size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const authClient = auth;
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(authClient?.currentUser ?? null);
  const [userId, setUserId] = useState<string | null>(authClient?.currentUser?.uid ?? null);
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE);
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(buildAccountDraft(DEFAULT_PROFILE));
  const [preferencesDraft, setPreferencesDraft] = useState<PreferenceOption[]>(DEFAULT_PROFILE.preferences);
  const [budgetDraft, setBudgetDraft] = useState<BudgetPreference | null>(DEFAULT_PROFILE.budgetPreference);
  const [openDialog, setOpenDialog] = useState<DialogKey>(null);
  const [saving, setSaving] = useState<SaveState>(DEFAULT_SAVE_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const syncDrafts = (nextProfile: ProfileState) => {
    setAccountDraft(buildAccountDraft(nextProfile));
    setPreferencesDraft(nextProfile.preferences);
    setBudgetDraft(nextProfile.budgetPreference);
  };

  useEffect(() => {
    if (!authClient) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authClient, async (user) => {
      setAuthUser(user);

      if (!user) {
        setUserId(null);
        setProfile(DEFAULT_PROFILE);
        syncDrafts(DEFAULT_PROFILE);
        setIsLoading(false);
        return;
      }

      setUserId(user.uid);
      setIsLoading(true);

      try {
        const userReference = db ? doc(db, "users", user.uid) : null;
        const userSnapshot = userReference && db ? await getDoc(userReference) : null;
        const userData = userSnapshot?.exists() ? userSnapshot.data() : {};
        const resolvedProfile: ProfileState = {
          username:
            typeof userData?.username === "string" && userData.username.trim().length > 0
              ? userData.username.trim()
              : user.displayName || user.email?.split("@")[0] || "User",
          email:
            typeof user.email === "string" && user.email.trim().length > 0
              ? user.email
              : typeof userData?.email === "string"
                ? userData.email
                : "",
          preferences: normalizePreferences(userData?.preferences),
          budgetPreference: deriveBudgetPreference(userData?.budgetPreference, userData?.preferences),
          notificationSettings: normalizeNotificationSettings(userData?.notificationSettings),
        };

        setProfile(resolvedProfile);
        syncDrafts(resolvedProfile);

        if (
          db &&
          userReference &&
          typeof user.email === "string" &&
          user.email.trim().length > 0 &&
          userData?.email !== user.email
        ) {
          await setDoc(
            userReference,
            {
              email: user.email,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
        const fallbackProfile: ProfileState = {
          username: user.displayName || user.email?.split("@")[0] || "User",
          email: user.email || "",
          preferences: [],
          budgetPreference: null,
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
        };
        setProfile(fallbackProfile);
        syncDrafts(fallbackProfile);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [authClient]);

  const setSavingState = (key: keyof SaveState, value: boolean) => {
    setSaving((current) => ({ ...current, [key]: value }));
  };

  const resetDialogDraft = (key: DialogKey) => {
    if (key === "account") {
      setAccountDraft(buildAccountDraft(profile));
      return;
    }

    if (key === "dietary") {
      setPreferencesDraft(profile.preferences);
      return;
    }

    if (key === "budget") {
      setBudgetDraft(profile.budgetPreference);
    }
  };

  const handleDialogOpenChange = (key: DialogKey, nextOpen: boolean) => {
    if (nextOpen) {
      resetDialogDraft(key);
      setOpenDialog(key);
      return;
    }

    resetDialogDraft(key);
    setOpenDialog((current) => (current === key ? null : current));
  };

  const handleLogout = async () => {
    if (!authClient) {
      navigate("/login");
      return;
    }

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

  const handlePreferenceToggle = (preference: PreferenceOption) => {
    setPreferencesDraft((current) =>
      current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference],
    );
  };

  const handleSaveDisplayName = async () => {
    const nextDisplayName = accountDraft.displayName.trim();

    if (!authUser || !userId || !db) {
      toast({
        title: "Unable to save display name",
        description: "Please try again once your account is loaded.",
        variant: "destructive",
      });
      return;
    }

    if (!nextDisplayName) {
      toast({
        title: "Display name required",
        description: "Enter a display name before saving.",
        variant: "destructive",
      });
      return;
    }

    setSavingState("displayName", true);

    try {
      await Promise.all([
        updateProfile(authUser, { displayName: nextDisplayName }),
        setDoc(
          doc(db, "users", userId),
          {
            username: nextDisplayName,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        ),
      ]);

      setProfile((current) => ({ ...current, username: nextDisplayName }));
      setAccountDraft((current) => ({ ...current, displayName: nextDisplayName }));
      toast({
        title: "Display name updated",
        description: "Your profile name has been saved.",
      });
    } catch (error) {
      console.error("Failed to update display name:", error);
      toast({
        title: "Could not update display name",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setSavingState("displayName", false);
    }
  };

  const handleSaveEmail = async () => {
    const nextEmail = accountDraft.email.trim();

    if (!authUser) {
      toast({
        title: "Unable to update email",
        description: "Please try again once your account is loaded.",
        variant: "destructive",
      });
      return;
    }

    if (!nextEmail) {
      toast({
        title: "Email required",
        description: "Enter an email address before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(nextEmail)) {
      toast({
        title: "Invalid email address",
        description: "Enter a valid email address and try again.",
        variant: "destructive",
      });
      return;
    }

    if (nextEmail === profile.email) {
      toast({
        title: "No email changes detected",
        description: "Your account is already using this email address.",
      });
      return;
    }

    setSavingState("email", true);

    try {
      await verifyBeforeUpdateEmail(authUser, nextEmail);
      setAccountDraft((current) => ({ ...current, email: profile.email }));
      toast({
        title: "Confirmation sent",
        description: "Check your new email for the confirmation link before the address changes.",
      });
    } catch (error) {
      console.error("Failed to update email:", error);
      toast({
        title: "Could not update email",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setSavingState("email", false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!authUser) {
      toast({
        title: "Unable to update password",
        description: "Please try again once your account is loaded.",
        variant: "destructive",
      });
      return;
    }

    if (!accountDraft.newPassword || !accountDraft.confirmPassword) {
      toast({
        title: "Password required",
        description: "Enter and confirm your new password before saving.",
        variant: "destructive",
      });
      return;
    }

    if (accountDraft.newPassword !== accountDraft.confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Make sure both password fields match exactly.",
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePasswordStrength(accountDraft.newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Password too weak",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

    setSavingState("password", true);

    try {
      await updatePassword(authUser, accountDraft.newPassword);
      setAccountDraft((current) => ({
        ...current,
        newPassword: "",
        confirmPassword: "",
      }));
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      console.error("Failed to update password:", error);
      toast({
        title: "Could not update password",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setSavingState("password", false);
    }
  };

  const handleSavePreferences = async () => {
    if (!userId || !db) {
      toast({
        title: "Unable to save preferences",
        description: "Please try again once your account is loaded.",
        variant: "destructive",
      });
      return;
    }

    setSavingState("preferences", true);

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          preferences: preferencesDraft,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      setProfile((current) => ({ ...current, preferences: preferencesDraft }));
      setOpenDialog(null);
      toast({
        title: "Preferences saved",
        description: "Your dietary preferences have been updated.",
      });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast({
        title: "Could not save preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingState("preferences", false);
    }
  };

  const handleSaveBudget = async () => {
    if (!userId || !db) {
      toast({
        title: "Unable to save budget",
        description: "Please try again once your account is loaded.",
        variant: "destructive",
      });
      return;
    }

    setSavingState("budget", true);

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          budgetPreference: budgetDraft,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      setProfile((current) => ({ ...current, budgetPreference: budgetDraft }));
      setOpenDialog(null);
      toast({
        title: "Budget saved",
        description: "Your budget preference has been updated.",
      });
    } catch (error) {
      console.error("Failed to save budget preference:", error);
      toast({
        title: "Could not save budget",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingState("budget", false);
    }
  };

  const handleNotificationToggle = async (key: keyof NotificationSettings, checked: boolean) => {
    if (!userId || !db) {
      toast({
        title: "Unable to update notifications",
        description: "Please try again once your account is loaded.",
        variant: "destructive",
      });
      return;
    }

    const previousSettings = profile.notificationSettings;
    const nextSettings = {
      ...previousSettings,
      [key]: checked,
    };

    setProfile((current) => ({
      ...current,
      notificationSettings: nextSettings,
    }));

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          notificationSettings: nextSettings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      setProfile((current) => ({
        ...current,
        notificationSettings: previousSettings,
      }));
      toast({
        title: "Could not update notifications",
        description: "Your notification setting was restored. Please try again.",
        variant: "destructive",
      });
    }
  };

  const enabledNotificationCount = Object.values(profile.notificationSettings).filter(Boolean).length;
  const menuCards: MenuCardProps[] = [
    {
      icon: User,
      title: "Account Settings",
      summary: (
        <>
          <p className="truncate">{profile.username}</p>
          <p className="truncate">{profile.email || "Email unavailable"}</p>
        </>
      ),
      onClick: () => handleDialogOpenChange("account", true),
    },
    {
      icon: Leaf,
      title: "Dietary Preferences",
      summary: `${profile.preferences.length} selected`,
      onClick: () => handleDialogOpenChange("dietary", true),
    },
    {
      icon: DollarSign,
      title: "Budget Preference",
      summary: profile.budgetPreference || "Not set",
      onClick: () => handleDialogOpenChange("budget", true),
    },
    {
      icon: Bell,
      title: "Notifications",
      summary: `${enabledNotificationCount} enabled`,
      onClick: () => handleDialogOpenChange("notifications", true),
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      summary: "Visibility, storage, and policy information",
      onClick: () => handleDialogOpenChange("privacy", true),
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      summary: "FAQs, support contact, and app details",
      onClick: () => handleDialogOpenChange("help", true),
    },
  ];

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
            <h1 className="text-xl font-display font-semibold text-foreground">{profile.username}</h1>
            <p className="text-sm font-body text-muted-foreground">{profile.email || "Home cook & foodie"}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 px-5">
        {isLoading ? (
          <div className="rounded-[28px] bg-card px-5 py-8 text-center shadow-soft">
            <div className="mx-auto mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            <p className="text-sm text-muted-foreground">Loading your profile settings...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {menuCards.map((card) => (
              <MenuCard key={card.title} {...card} />
            ))}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleLogout}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition duration-200 ease-out hover:bg-orange-600"
        >
          <LogOut size={16} />
          Log Out
        </motion.button>
      </div>

      <Dialog open={openDialog === "account"} onOpenChange={(open) => handleDialogOpenChange("account", open)}>
        <DialogContent aria-describedby={undefined} className="max-w-[560px] rounded-[32px] border-0 bg-card p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">Account Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-6 pb-6">
            <div className="space-y-3 border-b border-border pb-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User size={18} className="text-muted-foreground" />
                Display Name
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={accountDraft.displayName}
                  onChange={(event) => setAccountDraft((current) => ({ ...current, displayName: event.target.value }))}
                  className="h-12 rounded-[18px] border-border bg-background px-4"
                />
                <Button
                  type="button"
                  onClick={handleSaveDisplayName}
                  disabled={saving.displayName}
                  className="h-12 rounded-[18px] px-6"
                >
                  {saving.displayName ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="space-y-3 border-b border-border pb-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Mail size={18} className="text-muted-foreground" />
                Email Address
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  value={accountDraft.email}
                  onChange={(event) => setAccountDraft((current) => ({ ...current, email: event.target.value }))}
                  className="h-12 rounded-[18px] border-border bg-background px-4"
                />
                <Button
                  type="button"
                  onClick={handleSaveEmail}
                  disabled={saving.email}
                  className="h-12 rounded-[18px] px-6"
                >
                  {saving.email ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">A confirmation link will be sent to your new email.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock size={18} className="text-muted-foreground" />
                Change Password
              </div>
              <Input
                type="password"
                placeholder="New password"
                value={accountDraft.newPassword}
                onChange={(event) => setAccountDraft((current) => ({ ...current, newPassword: event.target.value }))}
                className="h-12 rounded-[18px] border-border bg-background px-4"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={accountDraft.confirmPassword}
                onChange={(event) =>
                  setAccountDraft((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                className="h-12 rounded-[18px] border-border bg-background px-4"
              />
              <Button
                type="button"
                onClick={handleUpdatePassword}
                disabled={saving.password}
                className="h-12 w-full rounded-full text-base font-semibold"
              >
                {saving.password ? "Updating password..." : "Update Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "dietary"} onOpenChange={(open) => handleDialogOpenChange("dietary", open)}>
        <DialogContent aria-describedby={undefined} className="max-w-[620px] rounded-[32px] border-0 bg-card p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <DialogTitle className="flex items-center gap-2 font-display text-[2rem] font-semibold text-foreground">
              <Leaf size={24} className="text-secondary" />
              Dietary Preferences
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-6 pb-6">
            <div className="flex flex-wrap gap-3">
              {PREFERENCE_OPTIONS.map((preference) => {
                const active = preferencesDraft.includes(preference);

                return (
                  <button
                    key={preference}
                    type="button"
                    onClick={() => handlePreferenceToggle(preference)}
                    className={`rounded-full px-5 py-3 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted text-foreground hover:bg-accent"
                    }`}
                  >
                    {preference}
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              onClick={handleSavePreferences}
              disabled={saving.preferences}
              className="h-12 w-full rounded-full text-base font-semibold"
            >
              {saving.preferences ? "Saving preferences..." : "Save Preferences"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "budget"} onOpenChange={(open) => handleDialogOpenChange("budget", open)}>
        <DialogContent aria-describedby={undefined} className="max-w-[520px] rounded-[32px] border-0 bg-card p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <DialogTitle className="flex items-center gap-2 font-display text-[2rem] font-semibold text-foreground">
              <DollarSign size={24} className="text-secondary" />
              Budget Preference
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-6 pb-6">
            <div className="flex flex-wrap gap-3">
              {BUDGET_PREFERENCES.map((budget) => {
                const active = budgetDraft === budget;

                return (
                  <button
                    key={budget}
                    type="button"
                    onClick={() => setBudgetDraft(budget)}
                    className={`rounded-full px-5 py-3 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted text-foreground hover:bg-accent"
                    }`}
                  >
                    {budget}
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              onClick={handleSaveBudget}
              disabled={saving.budget}
              className="h-12 w-full rounded-full text-base font-semibold"
            >
              {saving.budget ? "Saving budget..." : "Save Budget"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === "notifications"}
        onOpenChange={(open) => handleDialogOpenChange("notifications", open)}
      >
        <DialogContent aria-describedby={undefined} className="max-w-[560px] rounded-[32px] border-0 bg-card p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">Notifications</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6">
            <div className="flex items-center justify-between gap-4 rounded-[24px] bg-muted/60 px-4 py-4">
              <div className="flex items-start gap-3">
                <Bell size={20} className="mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Push Notifications</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get notified about meal times and recommendations
                  </p>
                </div>
              </div>
              <Switch
                checked={profile.notificationSettings.push}
                onCheckedChange={(checked) => handleNotificationToggle("push", checked)}
                aria-label="Toggle push notifications"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[24px] bg-muted/60 px-4 py-4">
              <div className="flex items-start gap-3">
                <Mail size={20} className="mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Email Notifications</p>
                  <p className="mt-1 text-sm text-muted-foreground">Receive weekly meal plan summaries</p>
                </div>
              </div>
              <Switch
                checked={profile.notificationSettings.email}
                onCheckedChange={(checked) => handleNotificationToggle("email", checked)}
                aria-label="Toggle email notifications"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[24px] bg-muted/60 px-4 py-4">
              <div className="flex items-start gap-3">
                <Bell size={20} className="mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Meal Reminders</p>
                  <p className="mt-1 text-sm text-muted-foreground">Reminders to plan your meals</p>
                </div>
              </div>
              <Switch
                checked={profile.notificationSettings.mealReminders}
                onCheckedChange={(checked) => handleNotificationToggle("mealReminders", checked)}
                aria-label="Toggle meal reminders"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "privacy"} onOpenChange={(open) => handleDialogOpenChange("privacy", open)}>
        <DialogContent aria-describedby={undefined} className="max-w-[560px] rounded-[32px] border-0 bg-card p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">
              Privacy & Security
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6">
            <DetailItem
              icon={Eye}
              title="Data Visibility"
              description="Your profile and preferences are only visible to you."
            />
            <DetailItem
              icon={Database}
              title="Data Storage"
              description="Your data is securely stored and encrypted in our cloud."
            />
            <DetailItem
              icon={Lock}
              title="Account Security"
              description="Change your password anytime from Account Settings."
            />
            <DetailItem
              icon={FileText}
              title="Terms of Service"
              description="Read our terms and conditions for using SmartEats."
            />
            <DetailItem
              icon={Shield}
              title="Privacy Policy"
              description="Learn how we collect, use, and protect your information."
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "help"} onOpenChange={(open) => handleDialogOpenChange("help", open)}>
        <DialogContent aria-describedby={undefined} className="max-w-[560px] rounded-[32px] border-0 bg-card p-0 shadow-2xl">
          <DialogHeader className="px-6 pb-2 pt-6 text-left">
            <DialogTitle className="font-display text-[2rem] font-semibold text-foreground">Help & Support</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6">
            <DetailItem
              icon={HelpCircle}
              title="FAQs"
              description="Find answers to commonly asked questions about SmartEats."
            />
            <DetailItem
              icon={MessageSquare}
              title="Contact Support"
              description="Reach out to us via email at support@smarteats.app"
            />
            <DetailItem
              icon={Phone}
              title="Live Chat"
              description="Chat with our support team during business hours."
            />
            <DetailItem icon={Info} title="App Version" description={APP_VERSION_LABEL} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
