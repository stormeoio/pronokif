/**
 * SetUsernamePage — onboarding continuation tests.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SetUsernamePage from "./SetUsernamePage";
import i18n from "@/i18n";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setUsername: vi.fn(),
  avatarsList: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "pilot@pronokif.com", username: null, level: 1, xp: 0 },
    setUsername: mocks.setUsername,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    avatars: {
      list: mocks.avatarsList,
    },
  },
}));

vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));


beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SetUsernamePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.setUsername.mockResolvedValue({ username: "PilotFlow" });
  mocks.avatarsList.mockResolvedValue({ all: [] });
});

describe("SetUsernamePage", () => {
  it("returns to pending league invitation after username creation", async () => {
    localStorage.setItem("pendingJoinCode", "abc123");
    renderPage();

    fireEvent.change(screen.getByTestId("username-input"), {
      target: { value: "PilotFlow" },
    });
    fireEvent.submit(screen.getByTestId("username-form"));

    await waitFor(() => {
      expect(mocks.setUsername).toHaveBeenCalledWith("PilotFlow");
      expect(mocks.navigate).toHaveBeenCalledWith("/join/ABC123");
    });
  });
});
