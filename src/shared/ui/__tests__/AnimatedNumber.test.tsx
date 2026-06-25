import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimatedNumber } from "../AnimatedNumber";

describe("AnimatedNumber", () => {
  it("renders formatted number", () => {
    render(<AnimatedNumber value={1234.5} prefix="$" decimals={2} />);
    expect(screen.getByText(/\$1\s234,50/)).toBeInTheDocument();
  });
});
