/**
 * ChampionshipPage — component tests.
 *
 * Covers: loading state, standings display, tab switching,
 * and API attribution footer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, renderWithProviders, screen, waitFor } from "@/test/utils";

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock fetch (ChampionshipPage uses native fetch, not apiClient)
const mockFetch = vi.fn();
global.fetch = mockFetch;

import ChampionshipPage from "./ChampionshipPage";

const mockDriversResponse = {
  MRData: {
    StandingsTable: {
      StandingsLists: [
        {
          season: "2026",
          DriverStandings: [
            {
              position: "1",
              points: "200",
              wins: "5",
              Driver: {
                givenName: "Max",
                familyName: "Verstappen",
                nationality: "Dutch",
                code: "VER",
              },
              Constructors: [{ name: "Red Bull Racing" }],
            },
            {
              position: "2",
              points: "150",
              wins: "3",
              Driver: {
                givenName: "Lando",
                familyName: "Norris",
                nationality: "British",
                code: "NOR",
              },
              Constructors: [{ name: "McLaren" }],
            },
          ],
        },
      ],
    },
  },
};

const mockConstructorsResponse = {
  MRData: {
    StandingsTable: {
      StandingsLists: [
        {
          ConstructorStandings: [
            {
              position: "1",
              points: "350",
              wins: "8",
              Constructor: { name: "Red Bull Racing", nationality: "Austrian" },
            },
          ],
        },
      ],
    },
  },
};

const mockScheduleResponse = {
  MRData: {
    RaceTable: {
      Races: [{ round: "1", raceName: "Bahrain Grand Prix", Circuit: { circuitName: "Bahrain" } }],
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("driverstandings")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDriversResponse) });
    }
    if (url.includes("constructorstandings")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConstructorsResponse) });
    }
    if (url.includes("current.json")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockScheduleResponse) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

describe("ChampionshipPage", () => {
  it("shows loading spinner initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ChampionshipPage />);
    expect(document.querySelector(".animate-shimmer")).toBeInTheDocument();
  });

  it("renders header with season after load", async () => {
    renderWithProviders(<ChampionshipPage />);

    await waitFor(() => {
      expect(screen.getByText(/championnat f1/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/saison/i)).toBeInTheDocument();
  });

  it("shows 3 tabs: Drivers, Ecuries, Resultats", async () => {
    renderWithProviders(<ChampionshipPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-drivers")).toBeInTheDocument();
    });
    expect(screen.getByTestId("tab-constructors")).toBeInTheDocument();
    expect(screen.getByTestId("tab-results")).toBeInTheDocument();
  });

  it("shows API attribution footer", async () => {
    renderWithProviders(<ChampionshipPage />);

    await waitFor(() => {
      expect(screen.getByText(/jolpica f1 api/i)).toBeInTheDocument();
    });
  });

  it("switches tabs on click", async () => {
    renderWithProviders(<ChampionshipPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-constructors")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-constructors"));
    expect(screen.getByText(/red bull racing/i)).toBeInTheDocument();
  });
});
