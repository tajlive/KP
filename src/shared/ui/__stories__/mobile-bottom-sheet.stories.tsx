import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MobileBottomSheet } from "../mobile-bottom-sheet";

const meta: Meta<typeof MobileBottomSheet> = {
  title: "Mobile/MobileBottomSheet",
  component: MobileBottomSheet,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof MobileBottomSheet>;

function ControlledSheet(
  props: Omit<React.ComponentProps<typeof MobileBottomSheet>, "open" | "onOpenChange">
) {
  const [open, setOpen] = useState(true);
  return <MobileBottomSheet open={open} onOpenChange={setOpen} {...props} />;
}

export const Default: Story = {
  render: () => (
    <ControlledSheet title="Order Preview" description="Review before confirming">
      <p className="text-white">BTCUSDT · 0.01 · Market</p>
    </ControlledSheet>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <ControlledSheet
      title="Filter"
      footer={
        <button className="w-full rounded-lg bg-emerald-500 py-2 text-white">
          Apply
        </button>
      }
    >
      <p className="text-white">Filter content</p>
    </ControlledSheet>
  ),
};

export const PreventClose: Story = {
  render: () => (
    <ControlledSheet
      title="Confirm Trade"
      preventClose
      footer={
        <button className="w-full rounded-lg bg-emerald-500 py-2 text-white">
          Confirm
        </button>
      }
    >
      <p className="text-white">This sheet cannot be dismissed by tapping the overlay.</p>
    </ControlledSheet>
  ),
};
