/**
 * Self-contained anti-FOUC theme script.
 *
 * This is injected into <head> via next/script strategy="beforeInteractive" so
 * the correct light/dark class is applied before the first paint.
 *
 * It is intentionally written as a plain string (not a function that gets
 * .toString()'d) so that Next.js/SWC minification helpers such as `__name` can
 * never leak into the inline script and cause a `ReferenceError: t is not
 * defined` at runtime.
 */
export function getThemeInitScript(): string {
  const attribute = "class";
  const storageKey = "theme";
  const defaultTheme = "system";
  const forcedTheme: string | undefined = undefined;
  const themes = ["light", "dark"];
  const value: Record<string, string> | undefined = undefined;
  const enableSystem = true;
  const enableColorScheme = true;

  const args = [
    JSON.stringify(attribute),
    JSON.stringify(storageKey),
    JSON.stringify(defaultTheme),
    JSON.stringify(forcedTheme),
    JSON.stringify(themes),
    JSON.stringify(value),
    JSON.stringify(enableSystem),
    JSON.stringify(enableColorScheme),
  ].join(",");

  return `(${scriptSource})(${args})`;
}

/**
 * Source of the inline theme script. This is a string literal, not a real
 * function, so it is never transformed by the bundler.
 */
const scriptSource = `function(attribute, storageKey, defaultTheme, forcedTheme, themes, value, enableSystem, enableColorScheme) {
  var el = document.documentElement;
  var systemThemes = ["light", "dark"];

  function updateDOM(theme) {
    var attrs = Array.isArray(attribute) ? attribute : [attribute];
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var isClass = attr === "class";
      var classes = isClass && value ? themes.map(function(t) { return value[t] || t; }) : themes;
      if (isClass) {
        el.classList.remove.apply(el.classList, classes);
        if (theme) el.classList.add(value && value[theme] ? value[theme] : theme);
      } else {
        if (theme) el.setAttribute(attr, theme);
        else el.removeAttribute(attr);
      }
    }
    if (enableColorScheme && systemThemes.indexOf(theme) !== -1) {
      el.style.colorScheme = theme;
    }
  }

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  try {
    var themeName = forcedTheme || localStorage.getItem(storageKey) || defaultTheme;
    var resolved = enableSystem && themeName === "system" ? getSystemTheme() : themeName;
    updateDOM(resolved);
  } catch (e) {}
}`;
