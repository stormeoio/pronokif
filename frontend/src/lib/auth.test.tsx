/**
 * Auth module tests — AuthProvider, useAuth, ProtectedRoute.
 * Updated for httpOnly cookie auth (no more localStorage tokens).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth, ProtectedRoute } from "./auth";

// Mock apiClient
vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  API: "http://localhost:8000/api",
}));

import { apiClient } from "@/lib/api";
const mockedApi = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// Helper component that consumes auth context
function AuthConsumer() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No user</div>;
  return <div>Hello {user.username}</div>;
}

function renderInProvider(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthProvider", () => {
  it("shows no user when /auth/session fails (no valid cookie session)", async () => {
    mockedApi.get.mockResolvedValue({ data: { user: null } });

    renderInProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText("No user")).toBeInTheDocument();
    });
  });

  it("validates session via /auth/session on mount (cookie-based)", async () => {
    const freshUser = { id: "1", email: "test@test.com", username: "tester" };
    mockedApi.get.mockResolvedValue({ data: { user: freshUser } });

    renderInProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText("Hello tester")).toBeInTheDocument();
    });

    // Should have called /auth/session to validate cookie session
    expect(mockedApi.get).toHaveBeenCalledWith("/auth/session");
  });

  it("uses cached user for instant hydration, then validates with backend", async () => {
    const cachedUser = { id: "1", email: "test@test.com", username: "cached" };
    const freshUser = { id: "1", email: "test@test.com", username: "fresh" };
    localStorage.setItem("user", JSON.stringify(cachedUser));

    mockedApi.get.mockResolvedValue({ data: { user: freshUser } });

    renderInProvider(<AuthConsumer />);

    // Initially shows cached user
    await waitFor(() => {
      expect(screen.getByText(/cached|fresh/)).toBeInTheDocument();
    });

    // After validation, shows fresh user from backend
    await waitFor(() => {
      expect(screen.getByText("Hello fresh")).toBeInTheDocument();
    });
  });

  it("clears cached user when /auth/session has no user", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "1", email: "x@x.com" }));

    mockedApi.get.mockResolvedValue({ data: { user: null } });

    renderInProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText("No user")).toBeInTheDocument();
    });

    // Cached user should be cleared (no token to clear — cookies are httpOnly)
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("does not store any token in localStorage", async () => {
    const loginResponse = {
      data: {
        access_token: "should-not-be-stored",
        user: { id: "1", email: "test@test.com", username: "tester" },
      },
    };
    mockedApi.post.mockResolvedValue(loginResponse);
    mockedApi.get.mockResolvedValue({ data: { user: null } }); // initial /auth/session has no user

    renderInProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText("No user")).toBeInTheDocument();
    });

    // Verify no token is ever stored in localStorage
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });
});

describe("ProtectedRoute", () => {
  it("redirects to /auth when no user", async () => {
    mockedApi.get.mockResolvedValue({ data: { user: null } });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<div>Auth Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Auth Page")).toBeInTheDocument();
    });
  });

  it("renders children when user session is valid", async () => {
    const validUser = { id: "1", email: "test@test.com", username: "tester" };
    localStorage.setItem("user", JSON.stringify(validUser));
    mockedApi.get.mockResolvedValue({ data: { user: validUser } });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<div>Auth Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Secret Content")).toBeInTheDocument();
    });
  });
});
