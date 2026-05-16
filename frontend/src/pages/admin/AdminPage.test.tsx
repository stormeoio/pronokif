/**
 * AdminPage — component tests.
 *
 * Covers: loading state, access denied for non-admin, tab navigation,
 * and sub-tab rendering for admin users.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, waitFor, mockAdminUser, mockUser } from "@/test/utils";

// Mock apiClient — all pages use it for data fetching
vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  API: "http://localhost:8000/api",
}));

// Mock sonner (toast)
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { apiClient } from "@/lib/api";
import AdminPage from "./AdminPage";

const mockedApi = vi.mocked(apiClient);

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
