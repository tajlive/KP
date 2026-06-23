import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { MobileBottomSheet } from "../mobile-bottom-sheet";

function ControlledSheet(
  props: Omit<React.ComponentProps<typeof MobileBottomSheet>, "open" | "onOpenChange">
) {
  const [open, setOpen] = useState(true);
  return <MobileBottomSheet open={open} onOpenChange={setOpen} {...props} />;
}

describe("MobileBottomSheet", () => {
  it("renders title, description and children", () => {
    render(
      <ControlledSheet title="Preview" description="Order details">
        <div data-testid="content">BTCUSDT</div>
      </ControlledSheet>
    );

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Order details")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders footer", () => {
    render(
      <ControlledSheet footer={<button>Confirm</button>}>
        <div>child</div>
      </ControlledSheet>
    );

    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("closes on Escape key by default", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileBottomSheet open onOpenChange={onOpenChange}>
        <div>child</div>
      </MobileBottomSheet>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close on Escape when preventClose is true", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileBottomSheet open onOpenChange={onOpenChange} preventClose>
        <div>child</div>
      </MobileBottomSheet>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
