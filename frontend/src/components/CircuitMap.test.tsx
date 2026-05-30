import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
      <CircuitMap
        circuitName="Imola"
        circuitFullName="Autodromo Internazionale Enzo e Dino Ferrari"
        country="Italy"
      />,
    );

    expect(screen.getByTestId("circuit-image")).toBeInTheDocument();
    expect(screen.queryByTestId("circuit-map-interactive")).not.toBeInTheDocument();
    expect(screen.getByText("Statique")).toBeInTheDocument();
  });

  it("renders the early-season 2026 circuit batch interactive cards", () => {
    render(
      <CircuitMap
        circuitName="Miami"
        circuitFullName="Miami International Autodrome"
        country="USA"
      />,
    );

    expect(screen.getByTestId("circuit-map-interactive")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("circuit-feature-button-tight-section"));
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Section lente");
  });

  it("renders Zandvoort interactive highlights from the local seed", () => {
    render(
      <CircuitMap
        circuitName="Zandvoort"
        circuitFullName="Circuit Zandvoort"
        country="Netherlands"
      />,
    );

    expect(screen.getByTestId("circuit-map-interactive")).toBeInTheDocument();
    expect(screen.getByTestId("circuit-hotspot-summary")).toHaveTextContent("7");
    expect(screen.getByTestId("circuit-feature-button-dune-sector")).toBeInTheDocument();
    expect(screen.getByTestId("circuit-feature-first-corner-tarzan")).toHaveTextContent(
      "Premier virage",
    );
    fireEvent.click(screen.getByTestId("circuit-feature-button-tarzan"));
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Tarzanbocht");
    expect(screen.getByTestId("circuit-first-corner-badge")).toHaveTextContent("Premier virage");
  });

  it("uses a lighter SVG layer in preview mode while keeping hotspot clicks", () => {
    const { container } = render(
      <CircuitMap
        circuitName="Zandvoort"
        circuitFullName="Circuit Zandvoort"
        country="Netherlands"
        renderMode="preview"
      />,
    );

    expect(container.querySelector("filter")).not.toBeInTheDocument();
    expect(container.querySelector("foreignObject")).not.toBeInTheDocument();
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Ligne de départ");

    fireEvent.mouseEnter(screen.getByTestId("circuit-feature-tarzan"));

    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Ligne de départ");

    fireEvent.click(screen.getByTestId("circuit-feature-tarzan"));

    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Tarzanbocht");
  });

  it("filters circuit hotspots by business type without losing SVG selection", () => {
    render(
      <CircuitMap
        circuitName="Zandvoort"
        circuitFullName="Circuit Zandvoort"
        country="Netherlands"
      />,
    );

    fireEvent.click(screen.getByTestId("circuit-hotspot-filter-drs"));

    expect(screen.queryByTestId("circuit-feature-button-tarzan")).not.toBeInTheDocument();
    expect(screen.getByTestId("circuit-feature-button-drs-main")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("circuit-zone-drs-main"));

    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("DRS principal");
  });

  it("can be focused and observed by a parent route", () => {
    const onHotspotSelect = vi.fn();

    render(
      <CircuitMap
        circuitName="Zandvoort"
        circuitFullName="Circuit Zandvoort"
        country="Netherlands"
        selectedHotspotId="tarzan"
        onHotspotSelect={onHotspotSelect}
      />,
    );

    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Tarzanbocht");

    fireEvent.click(screen.getByTestId("circuit-feature-button-drs-main"));

    expect(onHotspotSelect).toHaveBeenCalledWith("drs-main");
  });

  it("renders the European batch interactive cards", () => {
    render(
      <CircuitMap
        circuitName="Barcelona"
        circuitFullName="Circuit de Barcelona-Catalunya"
        country="Spain"
      />,
    );

    expect(screen.getByTestId("circuit-map-interactive")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("circuit-feature-button-la-caixa"));
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("La Caixa");
  });

  it("renders the late-summer circuit batch interactive cards", () => {
    render(
      <CircuitMap circuitName="Baku" circuitFullName="Baku City Circuit" country="Azerbaijan" />,
    );

    expect(screen.getByTestId("circuit-map-interactive")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("circuit-feature-button-castle"));
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Section château");
  });

  it("renders the next flyaway circuit batch interactive cards", () => {
    render(
      <CircuitMap circuitName="COTA" circuitFullName="Circuit of the Americas" country="USA" />,
    );

    expect(screen.getByTestId("circuit-map-interactive")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("circuit-feature-button-esses"));
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Esses");
  });

  it("renders the season finale circuit batch interactive cards", () => {
    render(
      <CircuitMap circuitName="Yas Marina" circuitFullName="Yas Marina Circuit" country="UAE" />,
    );

    expect(screen.getByTestId("circuit-map-interactive")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("circuit-feature-button-hairpin"));
    expect(screen.getByTestId("circuit-active-feature")).toHaveTextContent("Épingle");
  });
});
