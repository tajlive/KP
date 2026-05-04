import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentMethodSelector } from "../PaymentMethodSelector";

// Mutable mock for Vipps
let mockShowVipps = true;

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "payWithCard": "Betal med kort",
      "securePayment": "Sikker betaling med Stripe",
      "securePaymentNoVipps": "Sikker betaling",
    };
    return messages[key] || key;
  },
}));

// Mock VippsMarketProvider
vi.mock("@/shared/providers/VippsMarketProvider", () => ({
  useVippsMarket: () => ({ showVipps: mockShowVipps }),
}));

// Mock StripeCheckoutButton
vi.mock("../StripeCheckoutButton", () => ({
  StripeCheckoutButton: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="stripe-checkout">{children}</button>
  ),
}));

describe("PaymentMethodSelector", () => {
  const defaultProps = {
    stripePlanId: "price_test123",
    stripeTierSlug: "bachelor" as const,
    stripePlanName: "Bachelor Plan",
    billingCurrency: "NOK" as const,
  };

  beforeEach(() => {
    mockShowVipps = true;
  });

  it("renders Stripe checkout button", () => {
    render(<PaymentMethodSelector {...defaultProps} />);
    expect(screen.getByTestId("stripe-checkout")).toBeInTheDocument();
    expect(screen.getByText("Betal med kort")).toBeInTheDocument();
  });

  it("shows secure payment text when Vipps is available", () => {
    render(<PaymentMethodSelector {...defaultProps} />);
    expect(screen.getByText("Sikker betaling med Stripe")).toBeInTheDocument();
  });

  it("shows fallback text when Vipps is not available", () => {
    mockShowVipps = false;
    render(<PaymentMethodSelector {...defaultProps} />);
    expect(screen.getByText("Sikker betaling")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<PaymentMethodSelector {...defaultProps} className="my-class" />);
    const container = screen.getByTestId("stripe-checkout").parentElement;
    expect(container).toHaveClass("my-class");
  });
});
