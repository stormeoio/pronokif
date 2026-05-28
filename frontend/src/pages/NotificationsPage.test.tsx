/**
 * NotificationsPage — component tests.
 *
 * Covers: loading state, notification list rendering, empty state, mark all read.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, mockUser } from "@/test/utils";

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
      notifications: {
        list: () => unwrap(mockApiClient.get("/notifications")),
        unreadCount: () => unwrap(mockApiClient.get("/notifications/unread-count")),
        markRead: (id: string) => unwrap(mockApiClient.put(`/notifications/${id}/read`)),
        markAllRead: () => unwrap(mockApiClient.put("/notifications/read-all")),
      },
    },
    getApiError: (e: unknown, fallback = "Error") => {
      const err = e as { response?: { data?: { detail?: string } } };
      return err.response?.data?.detail || fallback;
    },
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import NotificationsPage from "./NotificationsPage";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NotificationsPage", () => {
  it("shows loading skeleton initially", () => {
    mockApiClient.get.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderWithProviders(<NotificationsPage />, { user: mockUser });
    expect(container.querySelector(".skeleton-arcade")).toBeInTheDocument();
  });

  it("renders notification list after load", async () => {
    const notifications = [
      {
        id: "n1",
        type: "info",
        title: "Welcome to PRONOKIF",
        message: "Have a good race!",
        is_read: false,
        created_at: "2026-05-10T12:00:00Z",
      },
      {
        id: "n2",
        type: "update",
        title: "Results available",
        message: "Monaco GP finished",
        is_read: true,
        created_at: "2026-05-09T10:00:00Z",
      },
    ];

    mockApiClient.get.mockImplementation((url: string) => {
      if (url === "/notifications") return Promise.resolve({ data: notifications });
      if (url === "/notifications/unread-count") return Promise.resolve({ data: { count: 1 } });
      return Promise.resolve({ data: null });
    });

    renderWithProviders(<NotificationsPage />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByText("Welcome to PRONOKIF")).toBeInTheDocument();
      expect(screen.getByText("Results available")).toBeInTheDocument();
    });
  });

  it("shows empty state when no notifications", async () => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === "/notifications") return Promise.resolve({ data: [] });
      if (url === "/notifications/unread-count") return Promise.resolve({ data: { count: 0 } });
      return Promise.resolve({ data: null });
    });

    renderWithProviders(<NotificationsPage />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByText("No notifications")).toBeInTheDocument();
    });
  });

  it("mark all read button calls the API", async () => {
    const notifications = [
      {
        id: "n1",
        type: "info",
        title: "Test",
        message: "Msg",
        is_read: false,
        created_at: "2026-05-10T12:00:00Z",
      },
    ];

    mockApiClient.get.mockImplementation((url: string) => {
      if (url === "/notifications") return Promise.resolve({ data: notifications });
      if (url === "/notifications/unread-count") return Promise.resolve({ data: { count: 1 } });
      return Promise.resolve({ data: null });
    });
    mockApiClient.put.mockResolvedValue({ data: undefined });

    renderWithProviders(<NotificationsPage />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith("/notifications/read-all");
    });
  });
});
