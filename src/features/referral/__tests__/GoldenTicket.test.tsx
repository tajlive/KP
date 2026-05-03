import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoldenTicket } from "../GoldenTicket";

const mockToastSuccess = vi.fn();

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("GoldenTicket", () => {
  const pendingTicket = {
    id: "ticket-1",
    ticket_code: "GOLDEN-ABC123",
    status: "pending" as const,
  };

  const usedTicket = {
    id: "ticket-2",
    ticket_code: "GOLDEN-USED456",
    status: "account_created" as const,
  };

  it("renders pending ticket with code", () => {
    render(<GoldenTicket ticket={pendingTicket} />);
    expect(screen.getByText("GOLDEN-ABC123")).toBeInTheDocument();
    expect(screen.getByText(/Kopier magisk lenke/i)).toBeInTheDocument();
  });

  it("renders used ticket as disabled", () => {
    render(<GoldenTicket ticket={usedTicket} />);
    expect(screen.getByText("GOLDEN-USED456")).toBeInTheDocument();
    expect(screen.queryByText(/Kopier magisk lenke/i)).not.toBeInTheDocument();
  });

  it("copies invite link to clipboard when clicked", async () => {
    document.documentElement.lang = "no";
    render(<GoldenTicket ticket={pendingTicket} />);

    fireEvent.click(screen.getByText(/Kopier magisk lenke/i));

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("GOLDEN-ABC123")
      );
    });
  });

  it("shows all possible ticket statuses", () => {
    const statuses = [
      "pending",
      "account_created",
      "binance_connected",
      "deposit_made",
      "rewarded",
    ] as const;

    statuses.forEach((status) => {
      const { container } = render(
        <GoldenTicket ticket={{ ...pendingTicket, status }} />
      );
      const isUsed = status !== "pending";
      const hasGrayscale = container.querySelector(".grayscale") !== null;
      expect(hasGrayscale).toBe(isUsed);
    });
  });
});
