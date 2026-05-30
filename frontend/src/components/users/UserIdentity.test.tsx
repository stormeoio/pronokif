import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserIdentity } from "./UserIdentity";
import { renderWithProviders, screen, waitFor, userEvent } from "@/test/utils";

const mockApi = vi.hoisted(() => ({
  avatars: {
    list: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  api: mockApi,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.avatars.list.mockResolvedValue({
    all: [
      {
        id: "helmet-44",
        name: "Helmet 44",
        category: "drivers",
        number: 44,
        colors: ["#00d2be", "#111111"],
      },
    ],
  });
});

describe("UserIdentity", () => {
  it("links app users to their public profile without fetching avatars when no avatar id exists", () => {
    renderWithProviders(
      <UserIdentity
        user={{ id: "user-44", username: "LewisFan", email: "lewis@example.test" }}
        withHoverCard={false}
      />,
    );

    expect(screen.getByRole("link", { name: /LewisFan/i })).toHaveAttribute(
      "href",
      "/profile/user-44",
    );
    expect(mockApi.avatars.list).not.toHaveBeenCalled();
  });

  it("links admin users to the back-office player dossier", () => {
    renderWithProviders(
      <UserIdentity
        surface="admin"
        user={{ id: "user-63", username: "George", avatar_id: "helmet-44" }}
        withHoverCard={false}
      />,
    );

    expect(screen.getByRole("link", { name: /George/i })).toHaveAttribute(
      "href",
      "/admin?tab=users&user=user-63",
    );
  });

  it("shows the shared hover card with avatar-backed player details", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <UserIdentity
        surface="admin"
        user={{
          id: "user-12",
          username: "Kimi",
          email: "kimi@example.test",
          avatar_id: "helmet-44",
          level: 7,
        }}
      />,
    );

    await waitFor(() => expect(mockApi.avatars.list).toHaveBeenCalledTimes(1));
    await user.hover(screen.getByRole("link", { name: /Kimi/i }));

    expect(await screen.findByText("kimi@example.test")).toBeInTheDocument();
    expect(screen.getByText("Niv. 7")).toBeInTheDocument();
    expect(screen.getByText("Fiche admin")).toBeInTheDocument();
  });

  it("uses an injected avatar object and renders avatar accessories without refetching", () => {
    renderWithProviders(
      <UserIdentity
        user={{ id: "user-81", username: "Oscar", avatar_id: "helmet-44" }}
        avatarObject={{
          id: "helmet-44",
          name: "Helmet 44",
          category: "drivers",
          number: 44,
          colors: ["#00d2be", "#111111"],
        }}
        avatarAccessory={
          <span data-testid="avatar-accessory" className="absolute -bottom-1 -right-1">
            edit
          </span>
        }
        withHoverCard={false}
      />,
    );

    expect(screen.getByText("Oscar")).toBeInTheDocument();
    expect(screen.getByText("44")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-accessory")).toBeInTheDocument();
    expect(mockApi.avatars.list).not.toHaveBeenCalled();
  });
});
