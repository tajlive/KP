import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StripeButton } from "../StripeButton";

describe("StripeButton", () => {
  it("renders button with Stripe branding", () => {
    render(<StripeButton />);
    expect(screen.getByText("Betal med kort")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<StripeButton onClick={handleClick} />);
    fireEvent.click(screen.getByText("Betal med kort"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("has correct styling classes", () => {
    render(<StripeButton />);
    const button = screen.getByText("Betal med kort").closest("button");
    expect(button).toHaveClass("bg-[#635BFF]");
    expect(button).toHaveClass("text-white");
    expect(button).toHaveClass("rounded-full");
  });
});
