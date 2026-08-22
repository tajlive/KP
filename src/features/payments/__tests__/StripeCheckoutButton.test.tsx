import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StripeCheckoutButton } from "../StripeCheckoutButton";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      loading: "Laster...",
      "errors.checkout_failed": "Kunne ikke starte betaling",
      "errors.unexpected": "Uventet feil",
    };
    return messages[key] || key;
  },
}));

// Mock next/navigation router (komponenten navigerer interne ruter via router.push)
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock window.location
Object.defineProperty(window, "location", {
  writable: true,
  value: { href: "", pathname: "/no/priser" },
});

// Mock fetch — komponenten bruker server-APIer (KLA-auth):
// /api/user/profile for auth-sjekk (401 = utlogget), /api/stripe/checkout for betaling
global.fetch = vi.fn();

function mockAuth(authenticated: boolean) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = typeof input === "string" ? input : String(input);
    if (url.includes("/api/user/profile")) {
      return Promise.resolve(
        authenticated
          ? ({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ profile: { id: "user-123" } }),
            } as unknown as Response)
          : ({
              ok: false,
              status: 401,
              json: () => Promise.resolve({ error: "Ikke innlogget" }),
            } as unknown as Response),
      );
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }),
    } as unknown as Response);
  });
}

describe("StripeCheckoutButton", () => {
  const defaultProps = {
    planId: "price_test123",
    tierSlug: "bachelor" as const,
    planName: "Bachelor",
    children: <span>Pay now</span>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "https://www.klarpakke.no/no/priser";
    window.location.pathname = "/no/priser";
  });

  it("renders children and button", () => {
    render(<StripeCheckoutButton {...defaultProps} />);
    expect(screen.getByText("Pay now")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("redirects to login when user is not authenticated", async () => {
    mockAuth(false);
    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
      const [target] = pushMock.mock.calls[0];
      expect(target).toContain("/no/innlogging");
      expect(target).toContain("redirect=");
      expect(target).toContain(encodeURIComponent("/no/priser"));
    });
  });

  it("redirects to Stripe checkout URL on success", async () => {
    mockAuth(true);

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/test");
    });
  });

  it("shows loading state while processing", async () => {
    vi.mocked(fetch).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Laster...")).toBeInTheDocument();
  });

  it("shows error message on checkout failure", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/user/profile")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ profile: { id: "user-123" } }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Price not found" }),
      } as unknown as Response);
    });

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Price not found")).toBeInTheDocument();
    });
  });

  it("calls API with correct body", async () => {
    mockAuth(true);

    render(<StripeCheckoutButton {...defaultProps} currency="EUR" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      const checkoutCall = vi
        .mocked(fetch)
        .mock.calls.find(([input]) =>
          String(input).includes("/api/stripe/checkout"),
        );
      expect(checkoutCall).toBeDefined();
      const [, init] = checkoutCall!;
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.tier).toBe("bachelor");
      expect(body.currency).toBe("EUR");
      expect(body.priceId).toBe("price_test123");
      // userId/userEmail sendes IKKE — server henter bruker fra auth-cookie
      expect(body.userId).toBeUndefined();
      expect(body.userEmail).toBeUndefined();
    });
  });

  it("handles missing checkout URL gracefully", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/user/profile")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ profile: { id: "user-123" } }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ url: null }),
      } as unknown as Response);
    });

    render(<StripeCheckoutButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(
        screen.getByText("Ingen checkout URL mottatt"),
      ).toBeInTheDocument();
    });
  });
});
