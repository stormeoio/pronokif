import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircuitMap } from "./CircuitMap";

describe("CircuitMap", () => {
  it("renders the interactive SVG layer for enriched circuits", () => {
    render(
      <CircuitMap circuitName="Monaco" circuitFullName="Circuit de Monaco" country="Monaco" />,
    );

    expect(screen.getByTestId("circuit-map-interactive")).toBeInTheDocument();
    expect(screen.getByTestId("circuit-name")).toHaveTextContent("Circuit de Monaco");
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Ligne de départ");

    fireEvent.click(screen.getByTestId("circuit-feature-button-tunnel"));

    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Tunnel");
  });

  it("falls back to the static image for circuits waiting for map metadata", () => {
    render(
      <CircuitMap circuitName="Baku" circuitFullName="Baku City Circuit" country="Azerbaijan" />,
    );

    expect(screen.getByTestId("circuit-image")).toBeInTheDocument();
    expect(screen.queryByTestId("circuit-map-interactive")).not.toBeInTheDocument();
    expect(screen.getByText("Statique")).toBeInTheDocument();
  });
});
