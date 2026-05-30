import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DriverEntityList, DriverEntityToken } from "./DriverEntityToken";
import { buildDriverLookup } from "./driverEntityUtils";
import type { Driver } from "@/types/api";

const drivers: Driver[] = [
  {
    id: "george-russell",
    name: "George Russell",
    first_name: "George",
    last_name: "Russell",
    team: "Mercedes",
    number: 63,
    country: "United Kingdom",
    code: "RUS",
    photo_url: "",
  },
  {
    id: "kimi-antonelli",
    name: "Kimi Antonelli",
    first_name: "Kimi",
    last_name: "Antonelli",
    team: "Mercedes",
    number: 12,
    country: "Italy",
    code: "ANT",
    photo_url: "",
  },
];

describe("DriverEntityToken", () => {
  it("renders a compact linked driver token from a code", () => {
    render(
      <MemoryRouter>
        <DriverEntityToken value="RUS" driversByReference={buildDriverLookup(drivers)} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Pilote: George Russell" });
    expect(link).toHaveTextContent("RUS");
    expect(link).toHaveAttribute("href", "/driver/george-russell");
  });

  it("falls back to a focusable token when the driver is unknown", () => {
    render(
      <MemoryRouter>
        <DriverEntityToken
          value="UNK - Unknown Driver"
          driversByReference={buildDriverLookup([])}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Pilote: UNK - Unknown Driver")).toHaveTextContent("UNK");
  });

  it("renders a compact ordered list of driver tokens", () => {
    render(
      <MemoryRouter>
        <DriverEntityList values={["RUS", "ANT"]} driversByReference={buildDriverLookup(drivers)} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Pilote: George Russell" })).toHaveTextContent("RUS");
    expect(screen.getByRole("link", { name: "Pilote: Kimi Antonelli" })).toHaveTextContent("ANT");
  });
});
