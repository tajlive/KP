import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReferralDashboard } from "../ReferralDashboard";

// Mock fetch BEFORE any vi.mock that depends on it
global.fetch = vi.fn();

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("ReferralDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<ReferralDashboard locale="no" />);
    // Empty state should NOT be visible during loading
    expect(screen.queryByText(/Ingen billetter generert ennå/i)).not.toBeInTheDocument();
    // Loading spinner should be present
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders tickets after loading", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tickets: [
          { id: "t1", ticket_code: "CODE1", status: "pending" },
          { id: "t2", ticket_code: "CODE2", status: "signed_up" },
        ],
      }),
    } as Response);

    render(<ReferralDashboard locale="no" />);

    await waitFor(() => {
      expect(screen.getByText("CODE1")).toBeInTheDocument();
      expect(screen.getByText("CODE2")).toBeInTheDocument();
    });
  });

  it("shows empty state when no tickets", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tickets: [] }),
    } as Response);

    render(<ReferralDashboard locale="no" />);

    await waitFor(() => {
      expect(screen.getByText(/Ingen billetter generert ennå/i)).toBeInTheDocument();
    });
  });

  it("shows error toast on fetch failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    render(<ReferralDashboard locale="no" />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Klarte ikke laste Golden Tickets."
      );
    });
  });

  it("generates new ticket on button click", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tickets: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ticket: { id: "new1", ticket_code: "NEWCODE", status: "pending" },
        }),
      } as Response);

    render(<ReferralDashboard locale="no" />);

    await waitFor(() => {
      expect(screen.getByText(/Generer Ny Billett/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Generer Ny Billett/i));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Golden Ticket generert! 🎉"
      );
    });
  });

  it("disables generate button when max tickets reached", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tickets: [
          { id: "t1", ticket_code: "CODE1", status: "pending" },
          { id: "t2", ticket_code: "CODE2", status: "pending" },
          { id: "t3", ticket_code: "CODE3", status: "pending" },
        ],
      }),
    } as Response);

    render(<ReferralDashboard locale="no" />);

    await waitFor(() => {
      const button = screen.getByText(/Generer Ny Billett/i).closest("button");
      expect(button).toBeDisabled();
    });
  });

  it("calculates stats correctly", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tickets: [
          { id: "t1", ticket_code: "CODE1", status: "pending" },
          { id: "t2", ticket_code: "CODE2", status: "signed_up" },
          { id: "t3", ticket_code: "CODE3", status: "converted", referrer_reward_months: 1 },
        ],
      }),
    } as Response);

    render(<ReferralDashboard locale="no" />);

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument(); // Active friends
      expect(screen.getByText("1 mnd")).toBeInTheDocument(); // Total reward months
    });
  });
});
