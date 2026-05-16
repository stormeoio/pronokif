/**
 * Auth module tests — AuthProvider, useAuth, ProtectedRoute.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("shows loading false and no user when localStorage is empty", async () => {
    renderInProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText("No user")).toBeInTheDocument();
    });
  });

  it("restores user from localStorage and validates via /auth/me", async () => {
    const savedUser = { id: "1", email: "test@test.com", username: "tester" };
    localStorage.setItem("token", "jwt-token");
    localStorage.setItem("user", JSON.stringify(savedUser));

    mockedApi.get.mockResolvedValue({ data: savedUser });

    renderInProvider(<AuthConsumer />);

    // Initially shows from localStorage
    await waitFor(() => {
      expect(screen.getByText("Hello tester")).toBeInTheDocument();
    });

    // Should have called /auth/me to validate
    expect(mockedApi.get).toHaveBeenCalledWith("/auth/me");
  });

  it("clears user when /auth/me fails", async () => {
    localStorage.setItem("token", "expired-token");
    localStorage.setItem("user", JSON.stringify({ id: "1", email: "x@x.com" }));

    mockedApi.get.mockRejectedValue(new Error("401"));

    renderInProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText("No user")).toBeInTheDocument();
    });

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});

describe("ProtectedRoute", () => {
  it("redirects to /auth when no user", async () => {
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

  it("renders children when user is present", async () => {
    const savedUser = { id: "1", email: "test@test.com", username: "tester" };
    localStorage.setItem("token", "valid");
    localStorage.setItem("user", JSON.stringify(savedUser));
    mockedApi.get.mockResolvedValue({ data: savedUser });

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
