/**
 * AuthPage — component tests.
 *
 * Covers: tab rendering, form fields, login/register submission, error handling.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "@/lib/auth";

// Force i18n to French for deterministic test output
import i18n from "@/i18n";
beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

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
    requestMagicLink: vi.fn().mockResolvedValue(undefined),
    loginWithMagicLink: vi.fn().mockResolvedValue({ username: null }),
    logout: vi.fn(),
    setUsername: vi.fn(),
    updateUser: vi.fn(),
    resendVerification: vi.fn().mockResolvedValue(undefined),
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
  localStorage.clear();
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

  it("register form has username, email and password fields", async () => {
    renderAuthPage();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("tab-register"));

    expect(screen.getByTestId("register-username")).toBeInTheDocument();
    expect(screen.getByTestId("register-email")).toBeInTheDocument();
    expect(screen.getByTestId("register-password")).toBeInTheDocument();
  });

  it("sends username during registration and navigates to league onboarding", async () => {
    const auth = renderAuthPage({
      register: vi.fn().mockResolvedValue({ username: "PilotFlow", current_league_id: null }),
    });
    const user = userEvent.setup();
    await user.click(screen.getByTestId("tab-register"));

    fireEvent.change(screen.getByTestId("register-username"), {
      target: { value: "PilotFlow" },
    });
    fireEvent.change(screen.getByTestId("register-email"), {
      target: { value: "pilot@pronokif.com" },
    });
    fireEvent.change(screen.getByTestId("register-password"), {
      target: { value: "Password123!" },
    });
    fireEvent.submit(screen.getByTestId("register-form"));

    await waitFor(() => {
      expect(auth.register).toHaveBeenCalledWith(
        "pilot@pronokif.com",
        "Password123!",
        expect.objectContaining({ username: "PilotFlow" }),
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/league");
    });
  });

  it("keeps a pending league invitation visible during auth", async () => {
    localStorage.setItem("pendingJoinCode", "abc123");
    renderAuthPage();

    expect(await screen.findByTestId("auth-pending-invite")).toHaveTextContent("ABC123");
    expect(screen.getByTestId("register-form")).toBeInTheDocument();
  });

  it("navigates to pending league invitation after registration", async () => {
    localStorage.setItem("pendingJoinCode", "abc123");
    const auth = renderAuthPage({
      register: vi.fn().mockResolvedValue({ username: "PilotFlow", current_league_id: null }),
    });

    fireEvent.change(await screen.findByTestId("register-username"), {
      target: { value: "PilotFlow" },
    });
    fireEvent.change(screen.getByTestId("register-email"), {
      target: { value: "pilot@pronokif.com" },
    });
    fireEvent.change(screen.getByTestId("register-password"), {
      target: { value: "Password123!" },
    });
    fireEvent.submit(screen.getByTestId("register-form"));

    await waitFor(() => {
      expect(auth.register).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/join/ABC123");
    });
  });

  it("navigates to pending league invitation after login", async () => {
    localStorage.setItem("pendingJoinCode", "abc123");
    const auth = renderAuthPage({
      login: vi.fn().mockResolvedValue({ username: "max33", current_league_id: "lg-1" }),
    });
    const user = userEvent.setup();
    await user.click(screen.getByTestId("tab-login"));

    fireEvent.change(screen.getByTestId("login-email"), {
      target: { value: "test@pronokif.com" },
    });
    fireEvent.change(screen.getByTestId("login-password"), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith("test@pronokif.com", "password123");
      expect(mockNavigate).toHaveBeenCalledWith("/join/ABC123");
    });
  });

  it("calls login on form submit and navigates to home", async () => {
    const auth = renderAuthPage();

    fireEvent.change(screen.getByTestId("login-email"), {
      target: { value: "test@pronokif.com" },
    });
    fireEvent.change(screen.getByTestId("login-password"), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith("test@pronokif.com", "password123");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Connexion réussie !");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error toast on failed login", async () => {
    const auth = renderAuthPage({
      login: vi.fn().mockRejectedValue({
        response: { data: { detail: "Identifiants invalides" } },
      }),
    });

    fireEvent.change(screen.getByTestId("login-email"), {
      target: { value: "bad@email.com" },
    });
    fireEvent.change(screen.getByTestId("login-password"), {
      target: { value: "wrong123" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Identifiants invalides");
    });
  });

  it("navigates to /set-username when user has no username", async () => {
    renderAuthPage({
      login: vi.fn().mockResolvedValue({ username: null, current_league_id: null }),
    });

    fireEvent.change(screen.getByTestId("login-email"), {
      target: { value: "new@user.com" },
    });
    fireEvent.change(screen.getByTestId("login-password"), {
      target: { value: "pass123456" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/set-username");
    });
  });
});
