import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TeamEntityToken } from "./TeamEntityToken";

describe("TeamEntityToken", () => {
  it("links a team token to the knowledge admin search", () => {
    render(
      <MemoryRouter>
        <TeamEntityToken teamId="mercedes" name="Mercedes F1 Team" nationality="German" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Écurie: Mercedes F1 Team" });
    expect(link).toHaveTextContent("Mercedes");
    expect(link).toHaveAttribute(
      "href",
      "/admin?tab=knowledge&entity_type=team&q=Mercedes+F1+Team",
    );
  });

  it("can render as a non-focusable token inside another clickable surface", () => {
    render(
      <MemoryRouter>
        <TeamEntityToken name="Ferrari" linked={false} focusable={false} />
      </MemoryRouter>,
    );

    const token = screen.getByLabelText("Écurie: Ferrari");
    expect(token).toHaveTextContent("Ferrari");
    expect(token).not.toHaveAttribute("tabindex");
  });
});
