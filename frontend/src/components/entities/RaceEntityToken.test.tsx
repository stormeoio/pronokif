import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CircuitEntityToken, DateEntityToken, RaceEntityToken } from "./RaceEntityToken";

describe("RaceEntityToken", () => {
  it("links a race token to the race detail page", () => {
    render(
      <MemoryRouter>
        <RaceEntityToken
          race={{
            id: "monaco-2026",
            name: "Monaco Grand Prix",
            circuit: "Circuit de Monaco",
            country: "Monaco",
            date: "2026-06-07",
            season: 2026,
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Course: Monaco Grand Prix" });
    expect(link).toHaveTextContent("Monaco GP");
    expect(link).toHaveAttribute("href", "/race/monaco-2026");
  });

  it("renders a circuit token without an admin link", () => {
    render(
      <MemoryRouter>
        <CircuitEntityToken circuit="Zandvoort" country="Netherlands" />
      </MemoryRouter>,
    );

    const token = screen.getByLabelText("Circuit: Zandvoort");
    expect(token).toHaveTextContent("Zandvoort");
    expect(token.tagName).not.toBe("A");
  });

  it("renders a date token", () => {
    render(
      <MemoryRouter>
        <DateEntityToken value="2026-06-07" href="/race/monaco-2026" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Date: 7 juin 2026" });
    expect(link).toHaveAttribute("href", "/race/monaco-2026");
  });
});
