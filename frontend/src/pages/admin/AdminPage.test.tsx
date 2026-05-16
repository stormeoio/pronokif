/**
 * AdminPage — component tests.
 *
 * Covers: loading state, access denied for non-admin, tab navigation,
 * and sub-tab rendering for admin users.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, waitFor, mockAdminUser, mockUser } from "@/test/utils";

// Mock apiClient + api — pages use typed api.* helpers which call apiClient internally
const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api", () => {
  const unwrap = (p: Promise<{ data: unknown }>) => p.then((r) => r.data);
  return {
    apiClient: mockApiClient,
    API: "http://localhost:8000/api",
    api: {
      admin: {
        races: () => unwrap(mockApiClient.get("/admin/races")),
        members: () => unwrap(mockApiClient.get("/admin/members")),
        feedback: () => unwrap(mockApiClient.get("/admin/feedback")),
      },
      drivers: {
        list: () => unwrap(mockApiClient.get("/drivers")),
      },
    },
    getApiError: (e: unknown, fallback = "Erreur") => {
      const err = e as { response?: { data?: { detail?: string } } };
      return err.response?.data?.detail || fallback;
    },
  };
});

// Mock sonner (toast)
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import AdminPage from "./AdminPage";

const mockedApi = mockApiClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminPage", () => {
  it("shows loading spinner initially", () => {
    // API never resolves → stays in loading state
    mockedApi.get.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AdminPage />, { user: mockAdminUser });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows access denied for non-admin users", async () => {
    mockedApi.get.mockRejectedValue({ response: { status: 403 } });

    renderWithProviders(<AdminPage />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/acces refuse/i)).toBeInTheDocument();
    });
  });

  it("renders admin tabs when user is admin", async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes("/admin/races")) {
        return Promise.resolve({
          data: [{ id: "r1", name: "Monaco GP", round: 6, status: "upcoming" }],
        });
      }
      if (url.includes("/drivers")) {
        return Promise.resolve({
          data: [{ id: "d1", name: "Max Verstappen", team: "Red Bull Racing" }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminPage />, { user: mockAdminUser });

    await waitFor(() => {
      expect(screen.getByText("Administration")).toBeInTheDocument();
    });

    // All 4 tabs visible
    expect(screen.getByText("Resultats")).toBeInTheDocument();
    expect(screen.getByText("Notifs")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("Membres")).toBeInTheDocument();
  });

  it("has the correct test id", async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes("/admin/races")) return Promise.resolve({ data: [] });
      if (url.includes("/drivers")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<AdminPage />, { user: mockAdminUser });

    await waitFor(() => {
      expect(screen.getByTestId("admin-page")).toBeInTheDocument();
    });
  });
});
