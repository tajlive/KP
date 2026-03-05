/**
 * E2E Tests: Component Consolidation Verification
 * Ensures no duplicate component folders exist after consolidation
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.join(__dirname, "../..");

test.describe("Component Consolidation", () => {
  test.describe("Duplicate folder removal", () => {
    test("auto-trade folder should not exist (consolidated into auto-trading)", () => {
      const autoTradePath = path.join(PROJECT_ROOT, "src/components/auto-trade");
      expect(fs.existsSync(autoTradePath)).toBe(false);
    });

    test("courses folder should not exist (consolidated into course)", () => {
      const coursesPath = path.join(PROJECT_ROOT, "src/components/courses");
      expect(fs.existsSync(coursesPath)).toBe(false);
    });

    test("auto-trading folder should contain all necessary components", () => {
      const autoTradingPath = path.join(PROJECT_ROOT, "src/components/auto-trading");
      expect(fs.existsSync(autoTradingPath)).toBe(true);
      
      // Check for key consolidated components
      const expectedFiles = [
        "TrialBanner.tsx",
        "StrategyCard.tsx", 
        "LiveStrategyView.tsx",
        "StrategyCharts.tsx",
      ];
      
      for (const file of expectedFiles) {
        const filePath = path.join(autoTradingPath, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });

  test.describe("Route consolidation", () => {
    test("courses route should not exist (redirected to kurs)", () => {
      const coursesRoutePath = path.join(PROJECT_ROOT, "src/app/[locale]/courses");
      expect(fs.existsSync(coursesRoutePath)).toBe(false);
    });

    test("auto-trading-ai should redirect to dashboard", async ({ page }) => {
      const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
      const response = await page.goto(`${BASE_URL}/auto-trading-ai`, {
        waitUntil: "networkidle",
      });
      
      expect([301, 308, 307]).toContain(response?.status());
    });
  });

  test.describe("Import validation", () => {
    test("no imports should reference deleted auto-trade folder", () => {
      const srcPath = path.join(PROJECT_ROOT, "src");
      
      function checkImports(dir: string): string[] {
        const errors: string[] = [];
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && !file.includes("node_modules")) {
            errors.push(...checkImports(filePath));
          } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            const content = fs.readFileSync(filePath, "utf-8");
            if (content.includes("from '@/components/auto-trade'")) {
              errors.push(`Found deprecated import in: ${filePath}`);
            }
          }
        }
        
        return errors;
      }
      
      const errors = checkImports(srcPath);
      expect(errors).toEqual([]);
    });

    test("no imports should reference deleted courses folder", () => {
      const srcPath = path.join(PROJECT_ROOT, "src");
      
      function checkImports(dir: string): string[] {
        const errors: string[] = [];
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory() && !file.includes("node_modules")) {
            errors.push(...checkImports(filePath));
          } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            const content = fs.readFileSync(filePath, "utf-8");
            if (content.includes("from '@/components/courses'")) {
              errors.push(`Found deprecated import in: ${filePath}`);
            }
          }
        }
        
        return errors;
      }
      
      const errors = checkImports(srcPath);
      expect(errors).toEqual([]);
    });
  });
});
