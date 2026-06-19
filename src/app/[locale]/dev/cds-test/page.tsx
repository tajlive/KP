"use client"

import { Box, HStack, VStack } from "@coinbase/cds-web/layout";
import { Text } from "@coinbase/cds-web/typography";
import { Card } from "@coinbase/cds-web/cards";
import { Button } from "@coinbase/cds-web/buttons";


export default function CdsTestPage() {
  return (
    <Box className="min-h-screen bg-kp-bg-secondary px-4 py-8">
      <VStack className="mx-auto max-w-4xl space-y-6">
        <Box>
          <Text as="h1" className="text-3xl font-bold text-slate-900">
            Coinbase Design System test
          </Text>
          <Text as="p" className="mt-2 text-slate-600">
            Verifiserer CDS-komponenter i Next.js App Router.
          </Text>
        </Box>

        <HStack className="gap-3">
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
        </HStack>

        <Card className="border border-slate-200 bg-white p-6">
          <VStack className="space-y-2">
            <Text as="h2" className="text-lg font-semibold text-slate-900">
              Card
            </Text>
            <Text as="p" className="text-slate-600">
              CDS Card med Klarpakke Tailwind-styling side om side.
            </Text>
          </VStack>
        </Card>
      </VStack>
    </Box>
  );
}
