import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updatePassword, updateProfile, verifyBeforeUpdateEmail } from "firebase/auth";
import ProfilePage from "@/pages/ProfilePage";
import {
  firebaseFirestoreModuleMock,
  getFirestoreDocument,
  seedFirestoreDocument,
} from "./firebaseTestUtils";

const mockedUpdateProfile = vi.mocked(updateProfile);
const mockedVerifyBeforeUpdateEmail = vi.mocked(verifyBeforeUpdateEmail);
const mockedUpdatePassword = vi.mocked(updatePassword);

const renderProfilePage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );

const seedProfile = () => {
  seedFirestoreDocument("users/test-user", {
    username: "Taylor",
    email: "test@example.com",
    preferences: ["Halal", "Low-carb"],
    budgetPreference: "Moderate",
    notificationSettings: {
      push: true,
      email: false,
      mealReminders: true,
    },
  });
};

describe("ProfilePage", () => {
  beforeEach(() => {
    mockedUpdateProfile.mockClear();
    mockedVerifyBeforeUpdateEmail.mockClear();
    mockedUpdatePassword.mockClear();
    firebaseFirestoreModuleMock.setDoc.mockClear();
    seedProfile();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads profile summaries and renders informational dialogs", async () => {
    renderProfilePage();

    expect(await screen.findByRole("heading", { name: "Taylor" })).toBeInTheDocument();
    expect(screen.getAllByText("test@example.com")[0]).toBeInTheDocument();
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("2 enabled")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /privacy & security/i }));
    expect(await screen.findByText("Data Visibility")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    fireEvent.click(screen.getByRole("button", { name: /help & support/i }));
    expect(await screen.findByText("FAQs")).toBeInTheDocument();
    expect(screen.getByText("SmartEats v1.0.0")).toBeInTheDocument();
  });

  it("saves dietary preferences from the popout dialog", async () => {
    renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: /dietary preferences/i }));
    fireEvent.click(screen.getByRole("button", { name: "Dairy-Free" }));
    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

    await waitFor(() => {
      const document = getFirestoreDocument("users/test-user") as { preferences?: string[] } | null;
      expect(document?.preferences).toEqual(["Halal", "Low Carb", "Dairy-Free"]);
    });

    expect(await screen.findByText("3 selected")).toBeInTheDocument();
  });

  it("saves the budget preference from the popout dialog", async () => {
    renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: /budget preference/i }));
    fireEvent.click(screen.getByRole("button", { name: "Premium" }));
    fireEvent.click(screen.getByRole("button", { name: /save budget/i }));

    await waitFor(() => {
      const document = getFirestoreDocument("users/test-user") as { budgetPreference?: string } | null;
      expect(document?.budgetPreference).toBe("Premium");
    });

    expect(await screen.findByText("Premium")).toBeInTheDocument();
  });

  it("updates the display name through Firebase auth and Firestore", async () => {
    renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: /account settings/i }));
    fireEvent.change(screen.getByDisplayValue("Taylor"), {
      target: { value: "Chef Taylor" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await waitFor(() => {
      expect(mockedUpdateProfile).toHaveBeenCalled();
      const document = getFirestoreDocument("users/test-user") as { username?: string } | null;
      expect(document?.username).toBe("Chef Taylor");
    });

    expect(screen.getByDisplayValue("Chef Taylor")).toBeInTheDocument();
  });

  it("sends email verification when the user changes their email address", async () => {
    renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: /account settings/i }));
    fireEvent.change(screen.getByDisplayValue("test@example.com"), {
      target: { value: "chef@example.com" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[1]);

    await waitFor(() => {
      expect(mockedVerifyBeforeUpdateEmail).toHaveBeenCalledWith(expect.any(Object), "chef@example.com");
    });

    const document = getFirestoreDocument("users/test-user") as { email?: string } | null;
    expect(document?.email).toBe("test@example.com");
  });

  it("blocks mismatched and weak passwords before calling Firebase", async () => {
    renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: /account settings/i }));
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "secret2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockedUpdatePassword).not.toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockedUpdatePassword).not.toHaveBeenCalled();
    });
  });

  it("persists notification changes immediately", async () => {
    renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: /notifications/i }));
    const emailSwitch = screen.getByRole("switch", { name: /toggle email notifications/i });
    fireEvent.click(emailSwitch);

    await waitFor(() => {
      const document = getFirestoreDocument("users/test-user") as {
        notificationSettings?: { email?: boolean };
      } | null;
      expect(document?.notificationSettings?.email).toBe(true);
    });
  });

  it("reverts a notification toggle if persistence fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    firebaseFirestoreModuleMock.setDoc.mockRejectedValueOnce(new Error("write failed"));

    renderProfilePage();

    fireEvent.click(await screen.findByRole("button", { name: /notifications/i }));
    const mealReminderSwitch = screen.getByRole("switch", { name: /toggle meal reminders/i });
    expect(mealReminderSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(mealReminderSwitch);

    await waitFor(() => {
      expect(mealReminderSwitch).toHaveAttribute("aria-checked", "true");
    });

    consoleErrorSpy.mockRestore();
  });
});
