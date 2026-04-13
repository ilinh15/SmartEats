import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/pages/ProfilePage";
import {
  firebaseAuthModuleMock,
  firebaseFirestoreModuleMock,
  getFirestoreDocument,
  seedFirestoreDocument,
  setMockAuthUser,
} from "./firebaseTestUtils";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const renderProfilePage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );

describe("ProfilePage", () => {
  beforeEach(() => {
    mockToast.mockReset();
    vi.mocked(firebaseAuthModuleMock.updateProfile).mockClear();
    vi.mocked(firebaseAuthModuleMock.verifyBeforeUpdateEmail).mockClear();
    vi.mocked(firebaseAuthModuleMock.updatePassword).mockClear();
    vi.mocked(firebaseFirestoreModuleMock.setDoc).mockClear();
    vi.mocked(firebaseFirestoreModuleMock.updateDoc).mockClear();
    setMockAuthUser({
      uid: "test-user",
      displayName: "Test User",
      email: "test@example.com",
      password: "password123",
    });
  });

  it("opens each popout from the profile menu", async () => {
    renderProfilePage();
    expect(await screen.findByText("Test User")).toBeInTheDocument();

    const dialogLabels = [
      "Account Settings",
      "Dietary Preferences",
      "Budget Preference",
      "Notifications",
      "Privacy & Security",
      "Help & Support",
    ];

    for (const label of dialogLabels) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(label, "i") }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText(label)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    }
  });

  it("loads saved profile summaries and renders informational dialogs", async () => {
    seedFirestoreDocument("users/test-user", {
      username: "iLinh",
      email: "stale@example.com",
      preferences: ["Vegan", "Keto"],
      budgetPreference: "Moderate",
      notificationSettings: {
        push: true,
        email: false,
        mealReminders: true,
      },
    });

    renderProfilePage();

    expect(await screen.findByText("iLinh")).toBeInTheDocument();
    expect(screen.getByText("iLinh - test@example.com")).toBeInTheDocument();
    expect(screen.getByText("2 preferences selected")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("2 notifications enabled")).toBeInTheDocument();

    await waitFor(() => {
      expect(getFirestoreDocument("users/test-user")?.email).toBe("test@example.com");
    });

    fireEvent.click(screen.getByRole("button", { name: /privacy & security/i }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Data Visibility")).toBeInTheDocument();
    expect(within(dialog).getByText("Privacy Policy")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));

    fireEvent.click(screen.getByRole("button", { name: /help & support/i }));
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("FAQs")).toBeInTheDocument();
    expect(within(dialog).getByText("App Version")).toBeInTheDocument();
    expect(within(dialog).getByText("SmartEats v0.0.0")).toBeInTheDocument();
  });

  it("saves dietary preferences from the popout dialog", async () => {
    seedFirestoreDocument("users/test-user", {
      username: "Test User",
      email: "test@example.com",
      preferences: ["Vegan"],
    });

    renderProfilePage();
    expect(await screen.findByText("Test User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dietary preferences/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Keto" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /save preferences/i }));

    await waitFor(() => {
      expect(getFirestoreDocument("users/test-user")?.preferences).toEqual(["Vegan", "Keto"]);
    });
  });

  it("saves the budget preference from the popout dialog", async () => {
    seedFirestoreDocument("users/test-user", {
      username: "Test User",
      email: "test@example.com",
      budgetPreference: null,
    });

    renderProfilePage();
    expect(await screen.findByText("Test User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /budget preference/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Premium" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /save budget/i }));

    await waitFor(() => {
      expect(getFirestoreDocument("users/test-user")?.budgetPreference).toBe("Premium");
    });
  });

  it("updates the display name through Firebase auth and Firestore", async () => {
    renderProfilePage();
    expect(await screen.findByText("Test User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /account settings/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Display Name"), {
      target: { value: "Chef Ling" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save display name/i }));

    await waitFor(() => {
      expect(firebaseAuthModuleMock.updateProfile).toHaveBeenCalled();
      expect(getFirestoreDocument("users/test-user")?.username).toBe("Chef Ling");
    });

    expect(await screen.findByText("Chef Ling")).toBeInTheDocument();
  });

  it("blocks mismatched and weak passwords before calling Firebase", async () => {
    renderProfilePage();
    expect(await screen.findByText("Test User")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /account settings/i }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("New Password"), {
      target: { value: "abcdef" },
    });
    fireEvent.change(within(dialog).getByLabelText("Confirm New Password"), {
      target: { value: "abcdeg" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /update password/i }));

    fireEvent.change(within(dialog).getByLabelText("New Password"), {
      target: { value: "123" },
    });
    fireEvent.change(within(dialog).getByLabelText("Confirm New Password"), {
      target: { value: "123" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /update password/i }));

    expect(firebaseAuthModuleMock.updatePassword).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Passwords do not match",
        variant: "destructive",
      }),
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Weak password",
        variant: "destructive",
      }),
    );
  });

  it("persists notification toggles and reverts them on failure", async () => {
    seedFirestoreDocument("users/test-user", {
      username: "Test User",
      email: "test@example.com",
      notificationSettings: {
        push: false,
        email: true,
        mealReminders: false,
      },
    });

    renderProfilePage();
    expect(await screen.findByText("1 notification enabled")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    const dialog = await screen.findByRole("dialog");
    const pushSwitch = within(dialog).getByRole("switch", { name: "Push Notifications" });
    fireEvent.click(pushSwitch);

    await waitFor(() => {
      expect(getFirestoreDocument("users/test-user")?.notificationSettings).toEqual({
        push: true,
        email: true,
        mealReminders: false,
      });
    });

    vi.mocked(firebaseFirestoreModuleMock.setDoc).mockRejectedValueOnce(new Error("save failed"));
    const reminderSwitch = within(dialog).getByRole("switch", { name: "Meal Reminders" });
    fireEvent.click(reminderSwitch);

    await waitFor(() => {
      expect(reminderSwitch).toHaveAttribute("aria-checked", "false");
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not update notifications",
        variant: "destructive",
      }),
    );
  });
});
