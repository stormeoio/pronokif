/**
 * RaceGrid — component tests.
 *
 * Verifies drivers are grouped by constructor, team logos + colors resolve,
 * driver photos render (with initials fallback), and the empty state shows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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
      drivers: {
        list: () => unwrap(mockApiClient.get("/drivers")),
      },
    },
    getApiError: (_e: unknown, fallback = "Erreur") => fallback,
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import RaceGrid from "./RaceGrid";

const DRIVERS = [
  {
    id: "leclerc",
    name: "Charles Leclerc",
    first_name: "Charles",
    last_name: "Leclerc",
    team: "Ferrari",
    number: 16,
    country: "MON",
    code: "LEC",
    photo_url: "",
  },
  {
    id: "hamilton",
    name: "Lewis Hamilton",
    first_name: "Lewis",
    last_name: "Hamilton",
    team: "Ferrari",
    number: 44,
    country: "GBR",
    code: "HAM",
    photo_url: "",
  },
  // Unknown-photo driver (new team) — must fall back to initials.
  {
    id: "newguy",
    name: "Jane Doe",
    first_name: "Jane",
    last_name: "Doe",
    team: "Cadillac",
    number: 88,
    country: "USA",
    code: "DOE",
    photo_url: "",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RaceGrid", () => {
  it("groups drivers by constructor with logos and photos", async () => {
    mockApiClient.get.mockResolvedValue({ data: DRIVERS });
    renderWithProviders(<RaceGrid />, { user: mockUser });

    // Teams resolved by name
    await waitFor(() => {
      expect(screen.getByText("Ferrari")).toBeInTheDocument();
    });
    expect(screen.getByText("Cadillac")).toBeInTheDocument();

    // Team logo (bundled SVG) rendered with team name as alt
    const ferrariLogo = screen.getByAltText("Ferrari") as HTMLImageElement;
    expect(ferrariLogo.getAttribute("src")).toContain("/images/teams/ferrari.svg");

    // Mapped driver gets a real photo headshot
    const leclercPhoto = screen.getByAltText("Charles Leclerc") as HTMLImageElement;
    expect(leclercPhoto.getAttribute("src")).toContain("media.formula1.com");

    // Driver names + codes present
    expect(screen.getByText("Leclerc")).toBeInTheDocument();
    expect(screen.getByText("HAM")).toBeInTheDocument();

    // Unknown-photo driver falls back to initials (no <img>)
    expect(screen.queryByAltText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows empty state when no drivers", async () => {
    mockApiClient.get.mockResolvedValue({ data: [] });
    renderWithProviders(<RaceGrid />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByText("Grille indisponible")).toBeInTheDocument();
    });
  });
});
