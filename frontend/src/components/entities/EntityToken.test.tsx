import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { EntityToken } from "./EntityToken";

describe("EntityToken", () => {
  it("renders a compact linked entity token", () => {
    render(
      <MemoryRouter>
        <EntityToken
          compactLabel="RUS"
          label="George Russell"
          kindLabel="Pilote"
          href="/driver/russell"
          tone="driver"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Pilote: George Russell" });

    expect(link).toHaveTextContent("RUS");
    expect(link).toHaveAttribute("href", "/driver/russell");
  });

  it("renders a focusable token without navigation when no href is provided", () => {
    render(
      <MemoryRouter>
        <EntityToken compactLabel="2026" label="Saison 2026" kindLabel="Année" />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Année: Saison 2026")).toHaveTextContent("2026");
  });

  it("renders clickable linked metadata in the hover infowindow", async () => {
    render(
      <MemoryRouter>
        <EntityToken
          compactLabel="RUS"
          label="George Russell"
          kindLabel="Pilote"
          href="/driver/russell"
          tone="driver"
          defaultOpen
          meta={[
            {
              label: "Écurie",
              value: "Mercedes",
              href: "/admin?tab=knowledge&entity_type=team&q=Mercedes",
              ariaLabel: "Ouvrir l'entité écurie Mercedes",
            },
          ]}
        />
      </MemoryRouter>,
    );

    const teamLink = await screen.findByRole("link", {
      name: "Ouvrir l'entité écurie Mercedes",
    });

    expect(teamLink).toHaveTextContent("Mercedes");
    expect(teamLink).toHaveAttribute("href", "/admin?tab=knowledge&entity_type=team&q=Mercedes");
  });
});
