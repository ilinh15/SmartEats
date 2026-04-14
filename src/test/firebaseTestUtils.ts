import { vi } from "vitest";

export interface MockAuthUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  password?: string | null;
}

type FirestoreDocumentData = Record<string, unknown>;
type AuthStateListener = (user: MockAuthUser | null) => void;

const DEFAULT_USER: MockAuthUser = {
  uid: "test-user",
  displayName: "Test User",
  email: "test@example.com",
  password: "password123",
};

const documentStore = new Map<string, FirestoreDocumentData>();
const authListeners = new Set<AuthStateListener>();
const mockDb = { __type: "mock-db" } as const;
const mockAuth = {
  currentUser: DEFAULT_USER as MockAuthUser | null,
};

const cloneDocument = (value: FirestoreDocumentData) =>
  JSON.parse(JSON.stringify(value)) as FirestoreDocumentData;

const mergeDocuments = (
  existing: FirestoreDocumentData | undefined,
  incoming: FirestoreDocumentData,
) => ({
  ...(existing ? cloneDocument(existing) : {}),
  ...cloneDocument(incoming),
});

const joinPath = (segments: unknown[]) => segments.map(String).join("/");

const getDocumentId = (path: string) => {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
};

const isDirectChildPath = (collectionPath: string, documentPath: string) => {
  if (!documentPath.startsWith(`${collectionPath}/`)) {
    return false;
  }

  const remainder = documentPath.slice(collectionPath.length + 1);
  return remainder.length > 0 && !remainder.includes("/");
};

const seedDefaultDocuments = () => {
  documentStore.set(`users/${DEFAULT_USER.uid}`, {
    username: "Test User",
    email: DEFAULT_USER.email,
    preferences: [],
    budgetPreference: null,
    notificationSettings: {
      push: true,
      email: true,
      mealReminders: true,
    },
  });
  documentStore.set("cooking_recommendations/tamago-sando", {
    title: "Tamago Sando",
    description: "Creamy Japanese egg salad tucked into pillowy milk bread for a soft, satisfying bite.",
    cuisine: "japanese",
    mealType: "breakfast",
    cookTimeMinutes: 15,
    ingredients: ["Eggs", "Japanese mayo", "Milk bread", "Butter", "Salt", "White pepper"],
    instructions: [
      "Boil the eggs until just set, then cool and peel them.",
      "Mash the eggs with Japanese mayo, salt, and white pepper.",
      "Butter the milk bread lightly for richness.",
      "Sandwich the egg filling between the bread and slice neatly.",
    ],
    imageUrl: null,
    isRecommended: true,
    difficulty: "Easy",
    tags: ["Soft", "Cafe-style"],
    createdAt: "2026-04-01T08:00:00.000Z",
    updatedAt: "2026-04-01T08:00:00.000Z",
  });
};

export const resetFirebaseTestState = () => {
  documentStore.clear();
  authListeners.clear();
  mockAuth.currentUser = DEFAULT_USER;
  seedDefaultDocuments();
};

export const setMockAuthUser = (user: MockAuthUser | null) => {
  mockAuth.currentUser = user;
  authListeners.forEach((listener) => listener(user));
};

export const seedFirestoreDocument = (path: string, data: FirestoreDocumentData) => {
  documentStore.set(path, cloneDocument(data));
};

export const deleteFirestoreDocument = (path: string) => {
  documentStore.delete(path);
};

export const getFirestoreDocument = (path: string) => {
  const stored = documentStore.get(path);
  return stored ? cloneDocument(stored) : null;
};

export const listFirestoreDocuments = (collectionPath: string) =>
  Array.from(documentStore.entries())
    .filter(([path]) => isDirectChildPath(collectionPath, path))
    .map(([path, data]) => ({
      id: getDocumentId(path),
      path,
      data: cloneDocument(data),
    }));

resetFirebaseTestState();

export const firebaseModuleMock = {
  app: { __type: "mock-app" },
  auth: mockAuth,
  db: mockDb,
  messaging: { __type: "mock-messaging" },
  isFirebaseConfigured: true,
};

export const firebaseAuthModuleMock = {
  getAuth: vi.fn(() => mockAuth),
  onAuthStateChanged: vi.fn((authInstance: typeof mockAuth, callback: AuthStateListener) => {
    authListeners.add(callback);
    callback(authInstance.currentUser);

    return () => {
      authListeners.delete(callback);
    };
  }),
  signOut: vi.fn(async () => {
    setMockAuthUser(null);
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(async (user: MockAuthUser, data: { displayName?: string | null }) => {
    if (Object.prototype.hasOwnProperty.call(data, "displayName")) {
      user.displayName = data.displayName ?? null;
    }

    if (mockAuth.currentUser?.uid === user.uid) {
      mockAuth.currentUser = {
        ...mockAuth.currentUser,
        displayName: user.displayName ?? null,
      };
    }
  }),
  verifyBeforeUpdateEmail: vi.fn(async (_user: MockAuthUser, _newEmail: string) => {}),
  updatePassword: vi.fn(async (user: MockAuthUser, newPassword: string) => {
    user.password = newPassword;

    if (mockAuth.currentUser?.uid === user.uid) {
      mockAuth.currentUser = { ...mockAuth.currentUser, password: newPassword };
    }
  }),
};

export const firebaseFirestoreModuleMock = {
  getFirestore: vi.fn(() => mockDb),
  doc: vi.fn((database: unknown, ...segments: unknown[]) => ({
    database,
    path: joinPath(segments),
    id: String(segments[segments.length - 1] ?? ""),
  })),
  collection: vi.fn((database: unknown, ...segments: unknown[]) => ({
    database,
    path: joinPath(segments),
  })),
  getDoc: vi.fn(async (reference: { path: string; id?: string }) => {
    const stored = documentStore.get(reference.path);

    return {
      id: reference.id ?? getDocumentId(reference.path),
      exists: () => stored !== undefined,
      data: () => (stored ? cloneDocument(stored) : undefined),
    };
  }),
  getDocs: vi.fn(async (reference: { path: string }) => ({
    docs: listFirestoreDocuments(reference.path).map((document) => ({
      id: document.id,
      data: () => cloneDocument(document.data),
    })),
  })),
  setDoc: vi.fn(async (reference: { path: string }, data: FirestoreDocumentData, options?: { merge?: boolean }) => {
    if (options?.merge) {
      const existing = documentStore.get(reference.path);
      documentStore.set(reference.path, mergeDocuments(existing, data));
      return;
    }

    documentStore.set(reference.path, cloneDocument(data));
  }),
  updateDoc: vi.fn(async (reference: { path: string }, data: FirestoreDocumentData) => {
    const existing = documentStore.get(reference.path);
    documentStore.set(reference.path, mergeDocuments(existing, data));
  }),
  deleteDoc: vi.fn(async (reference: { path: string }) => {
    documentStore.delete(reference.path);
  }),
};
