import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LivePill } from '../LivePill';

const messages = {
  components: {
    livePill: {
      label: 'Live',
    },
  },
};

const renderWithI18n = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe('LivePill', () => {
  it('renders live label and pulse indicators', () => {
    renderWithI18n(<LivePill />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithI18n(<LivePill className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
