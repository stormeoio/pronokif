/**
 * AuthPage — component tests.
 *
 * Covers: tab rendering, form fields, login/register submission, error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "@/lib/auth";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { toast } from "sonner";
import AuthPage from "./AuthPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderAuthPage(authOverrides = {}) {
  const authValue = {
    user: null,
    loading: false,
    login: vi.fn().mockResolvedValue({ username: "max33", current_league_id: "lg-1" }),
    register: vi.fn().mockResolvedValue({ username: null, current_league_id: null }),
    logout: vi.fn(),
    setUsername: vi.fn(),
    updateUser: vi.fn(),
    ...authOverrides,
  };

  render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <AuthPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return authValue;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthPage", () => {
  it("renders login and register tabs", () => {
    renderAuthPage();
    expect(screen.getByTestId("tab-login")).toBeInTheDocument();
    expect(screen.getByTestId("tab-register")).toBeInTheDocument();
  });

  it("login form has email, password fields and submit button", () => {
    renderAuthPage();
    expect(screen.getByTestId("login-email")).toBeInTheDocument();
    expect(screen.getByTestId("login-password")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeInTheDocument();
  });

  it("register form has email and password fields", async () => {
    renderAuthPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("tab-register"));

    expect(screen.getByTestId("register-email")).toBeInTheDocument();
    expect(screen.getByTestId("register-password")).toBeInTheDocument();
  });

  it("calls login on form submit and navigates to home", async () => {
    const auth = renderAuthPage();
    const user = userEvent.setup();

    await user.type(screen.getByTestId("login-email"), "test@pronokif.com");
    await user.type(screen.getByTestId("login-password"), "password123");
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith("test@pronokif.com", "password123");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Signed in successfully!");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error toast on failed login", async () => {
    const auth = renderAuthPage({
      login: vi.fn().mockRejectedValue({
        response: { data: { detail: "Identifiants invalides" } },
      }),
    });
    const user = userEvent.setup();

    await user.type(screen.getByTestId("login-email"), "bad@email.com");
    await user.type(screen.getByTestId("login-password"), "wrong123");
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Identifiants invalides");
    });
  });

  it("navigates to /set-username when user has no username", async () => {
    renderAuthPage({
      login: vi.fn().mockResolvedValue({ username: null, current_league_id: null }),
    });
    const user = userEvent.setup();

    await user.type(screen.getByTestId("login-email"), "new@user.com");
    await user.type(screen.getByTestId("login-password"), "pass123456");
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/set-username");
    });
  });
});
