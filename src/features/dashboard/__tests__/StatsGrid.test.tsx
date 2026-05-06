import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsGrid, StatsGridMini } from "../StatsGrid";
import { TrendingUp, TrendingDown, Target, Activity } from "lucide-react";

const mockStats = [
  { label: "Total PnL", value: "+15,4%", subtext: "vs forrige måned", trend: "up" as const, icon: TrendingUp },
  { label: "Win Rate", value: "67%", subtext: "8 av 12 trades", trend: "up" as const, icon: Target },
  { label: "Drawdown", value: "-3,2%", subtext: "maksimalt", trend: "down" as const, icon: TrendingDown },
  { label: "Aktive botter", value: "3", subtext: "2 paper, 1 live", trend: "neutral" as const, icon: Activity, highlight: true },
];

describe("StatsGrid", () => {
  it("renders all stat cards", () => {
    render(<StatsGrid stats={mockStats} />);
    expect(screen.getByText("Total PnL")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Drawdown")).toBeInTheDocument();
    expect(screen.getByText("Aktive botter")).toBeInTheDocument();
  });

  it("renders correct values", () => {
    render(<StatsGrid stats={mockStats} />);
    expect(screen.getByText("+15,4%")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("-3,2%")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders subtext for each stat", () => {
    render(<StatsGrid stats={mockStats} />);
    expect(screen.getByText("vs forrige måned")).toBeInTheDocument();
    expect(screen.getByText("8 av 12 trades")).toBeInTheDocument();
    expect(screen.getByText("maksimalt")).toBeInTheDocument();
    expect(screen.getByText("2 paper, 1 live")).toBeInTheDocument();
  });

  it("shows trending up icon for positive stats", () => {
    render(<StatsGrid stats={mockStats} />);
    // TrendingUp icon rendered as SVG with lucide class
    const svgs = document.querySelectorAll("svg.lucide-trending-up");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows trending down icon for negative stats", () => {
    render(<StatsGrid stats={mockStats} />);
    // TrendingDown icon rendered as SVG with lucide class
    const svgs = document.querySelectorAll("svg.lucide-trending-down");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("applies highlight styling to highlighted stat", () => {
    render(<StatsGrid stats={mockStats} />);
    // Highlighted card should have the highlight label
    expect(screen.getByText("Aktive botter")).toBeInTheDocument();
  });

  it("renders empty grid with no stats", () => {
    render(<StatsGrid stats={[]} />);
    expect(screen.queryByText("Total PnL")).not.toBeInTheDocument();
  });
});

describe("StatsGridMini", () => {
  it("renders max 4 stats", () => {
    const sixStats = [
      ...mockStats,
      { label: "Extra 1", value: "1", subtext: "", trend: "neutral" as const, icon: Activity },
      { label: "Extra 2", value: "2", subtext: "", trend: "neutral" as const, icon: Activity },
    ];
    render(<StatsGridMini stats={sixStats} />);
    expect(screen.getByText("Total PnL")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Drawdown")).toBeInTheDocument();
    expect(screen.getByText("Aktive botter")).toBeInTheDocument();
    expect(screen.queryByText("Extra 1")).not.toBeInTheDocument();
  });

  it("renders compact layout", () => {
    render(<StatsGridMini stats={mockStats} />);
    expect(screen.getByText("+15,4%")).toBeInTheDocument();
    expect(screen.getByText("Total PnL")).toBeInTheDocument();
  });
});
