import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import {
  firebaseAuthModuleMock,
  firebaseFirestoreModuleMock,
  firebaseModuleMock,
  resetFirebaseTestState,
} from "./firebaseTestUtils";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

Object.defineProperty(navigator, "serviceWorker", {
  writable: true,
  value: {
    register: vi.fn(async () => ({ scope: "/" })),
    ready: Promise.resolve({ scope: "/" }),
  },
});

Object.defineProperty(window, "Notification", {
  writable: true,
  value: {
    requestPermission: vi.fn(async () => "granted"),
  },
});

vi.mock("@/lib/firebase", () => firebaseModuleMock);
vi.mock("firebase/auth", () => firebaseAuthModuleMock);
vi.mock("firebase/firestore", () => firebaseFirestoreModuleMock);
vi.mock("firebase/messaging", () => ({
  getToken: vi.fn(async () => "mock-fcm-token"),
  onMessage: vi.fn(() => () => {}),
}));

afterEach(() => {
  resetFirebaseTestState();
});
