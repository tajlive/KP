import type { Meta, StoryObj } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import { BottomTabs } from "../BottomTabs";

const messages = {
  navigation: {
    portfolio: "Portfolio",
    market: "Market",
    trade: "Trade",
    account: "Account",
  },
};

const meta: Meta<typeof BottomTabs> = {
  title: "Mobile/BottomTabs",
  component: BottomTabs,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/no/dashboard/portfolio",
      },
    },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="no" messages={messages}>
        <div className="bg-[#0a0b0d] min-h-screen">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof BottomTabs>;

export const Default: Story = {};
