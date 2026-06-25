import { describe, it, expect } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeProvider";

function Consumer() {
  const { theme, resolvedTheme, setTheme, systemTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="system">{systemTheme}</span>
      <button onClick={() => setTheme("dark")}>set dark</button>
      <button onClick={() => setTheme("light")}>set light</button>
      <button onClick={() => setTheme("system")}>set system</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("provides the default theme and resolves system to a concrete value", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(screen.getByTestId("system").textContent).toMatch(/^(light|dark)$/);
  });

  it("updates theme and resolvedTheme when setTheme is called", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    act(() =>
      fireEvent.click(screen.getByRole("button", { name: "set dark" })),
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");

    act(() =>
      fireEvent.click(screen.getByRole("button", { name: "set light" })),
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("keeps system as the theme value but resolves to the concrete system theme", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    act(() =>
      fireEvent.click(screen.getByRole("button", { name: "set dark" })),
    );
    act(() =>
      fireEvent.click(screen.getByRole("button", { name: "set system" })),
    );

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toMatch(
      /^(light|dark)$/,
    );
  });
});
