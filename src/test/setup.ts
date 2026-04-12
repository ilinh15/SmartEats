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

vi.mock("@/lib/firebase", () => firebaseModuleMock);
vi.mock("firebase/auth", () => firebaseAuthModuleMock);
vi.mock("firebase/firestore", () => firebaseFirestoreModuleMock);

afterEach(() => {
  resetFirebaseTestState();
});
