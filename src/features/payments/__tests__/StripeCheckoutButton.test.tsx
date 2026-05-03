import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StripeCheckoutButton } from "../StripeCheckoutButton";

const mockGetUser = vi.fn();
const mockPush = vi.fn();

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "loading": "Laster...",
      "errors.checkout_failed": "Kunne ikke starte betaling",
      "errors.unexpected": "Uventet feil",
    };
    return messages[key] || key;
  },
}));

// Mock Supabase client
vi.mock("@/lib/utils", () => ({
  createClient: () => ({
    auth: { getUser: () => mockGetUser() },
  }),
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" "),
}));

// Mock window.location
Object.defineProperty(window, "location", {
  writable: true,
  value: { href: "", pathname: "/no/priser" },
});

// Mock fetch
global.fetch = vi.fn();

describe("StripeCheckoutButton", () => {
  const defaultProps = {
    planId: "price_test123",
    tierSlug: "bachelor" as const,
    planName: "Bachelor",
    children: <span>Pay now</span>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
    window.location.pathname = "/no/priser";
  });

  it("renders children and button", () => {
    render(<StripeCheckoutButton {...defaultProps} />);
    expect(screen.getByText("Pay now")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("redirects to login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(window.location.href).toContain("/no/innlogging");
      expect(window.location.href).toContain("redirect=");
    });
  });

  it("redirects to Stripe checkout URL on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }),
    } as Response);

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/test");
    });
  });

  it("shows loading state while processing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    vi.mocked(fetch).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Laster...")).toBeInTheDocument();
  });

  it("shows error message on checkout failure", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Price not found" }),
    } as Response);

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Price not found")).toBeInTheDocument();
    });
  });

  it("calls API with correct body", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }),
    } as Response);

    render(<StripeCheckoutButton {...defaultProps} currency="EUR" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/stripe/checkout", expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("\"tier\":\"bachelor\""),
      }));
      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
      expect(body.currency).toBe("EUR");
      expect(body.userId).toBe("user-123");
    });
  });

  it("handles missing checkout URL gracefully", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: null }),
    } as Response);

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Ingen checkout URL mottatt")).toBeInTheDocument();
    });
  });
});
