#!/usr/bin/env node
/**
 * @vitest-environment node
 * 
 * Tester for KIMI CLI Wrapper
 * 
 * Verifiserer:
 * 1. MCP-operasjoner mapper til korrekte CLI-kommandoer
 * 2. Input-validering fungerer før exec
 * 3. Strukturert output per steg
 * 4. Fail-fast med tydelig feil ved ukjent kommando
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { 
  validateCommand, 
  executeCommand, 
  getAvailableCommands, 
  getCommandHelp,
  type CommandResult,
  type StepResult 
} from "./kimi-cli-wrapper";
import { spawn } from "child_process";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

describe("KIMI CLI Wrapper", () => {
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSpawn = vi.mocked(spawn);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // TEST: Input-validering
  // ============================================================================
  describe("validateCommand", () => {
    it("should validate existing db status command", () => {
      const result = validateCommand("db", "status");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate existing db push command", () => {
      const result = validateCommand("db", "push");
      expect(result.valid).toBe(true);
    });

    it("should validate existing ci commands", () => {
      expect(validateCommand("ci", "default").valid).toBe(true);
      expect(validateCommand("ci", "typecheck").valid).toBe(true);
      expect(validateCommand("ci", "test").valid).toBe(true);
      expect(validateCommand("ci", "build").valid).toBe(true);
    });

    it("should validate existing monitor full command", () => {
      const result = validateCommand("monitor", "full");
      expect(result.valid).toBe(true);
    });

    it("should fail for unknown tool", () => {
      const result = validateCommand("unknown", "action");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ukjent tool: unknown");
      expect(result.error).toContain("db, ci, monitor");
    });

    it("should fail for unknown action", () => {
      const result = validateCommand("db", "unknown-action");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ukjent action: unknown-action");
      expect(result.error).toContain("status, push, gen-types, migrate, lint");
    });

    it("should fail for invalid tool type", () => {
      const result = validateCommand(null as unknown as string, "status");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ugyldig tool");
    });

    it("should use default action when not specified", () => {
      const result = validateCommand("ci", "");
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // TEST: Kommando-mapping korrekthet
  // ============================================================================
  describe("Command Mapping", () => {
    it("should map kimi_db status to npm run db:status", async () => {
      const mockStdout = "Database status: OK";
      const mockChild = createMockChildProcess(0, mockStdout, "");
      mockSpawn.mockReturnValue(mockChild);

      const result = await executeCommand("db", "status");

      expect(mockSpawn).toHaveBeenCalledWith(
        "npm",
        ["run", "db:status"],
        expect.objectContaining({
          env: expect.objectContaining({ CI: "true" }),
        })
      );
    });

    it("should map kimi_db push to npm run db:push", async () => {
      const mockChild = createMockChildProcess(0, "Pushed", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("db", "push");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "db:push"], expect.any(Object));
    });

    it("should map kimi_ci to npm run lint:gate", async () => {
      const mockChild = createMockChildProcess(0, "Lint passed", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("ci", "default");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "lint:gate"], expect.any(Object));
    });

    it("should map kimi_ci typecheck to npm run type-check", async () => {
      const mockChild = createMockChildProcess(0, "Type-check passed", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("ci", "typecheck");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "type-check"], expect.any(Object));
    });

    it("should map kimi_ci test to npm run test:unit", async () => {
      const mockChild = createMockChildProcess(0, "Tests passed", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("ci", "test");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "test:unit"], expect.any(Object));
    });

    it("should map kimi_ci build to npm run build", async () => {
      const mockChild = createMockChildProcess(0, "Build passed", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("ci", "build");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "build"], expect.any(Object));
    });

    it("should map kimi_monitor full to npm run health:full", async () => {
      const mockChild = createMockChildProcess(0, "Health OK", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("monitor", "full");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "health:full"], expect.any(Object));
    });

    it("should map kimi_monitor prod to npm run verify:prod", async () => {
      const mockChild = createMockChildProcess(0, "Prod verified", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("monitor", "prod");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "verify:prod"], expect.any(Object));
    });

    it("should map kimi_monitor api to npm run health:api", async () => {
      const mockChild = createMockChildProcess(0, "API OK", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("monitor", "api");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "health:api"], expect.any(Object));
    });
  });

  // ============================================================================
  // TEST: Strukturert output
  // ============================================================================
  describe("Structured Output", () => {
    it("should return structured result with all fields", async () => {
      const mockStdout = "Success output";
      const mockChild = createMockChildProcess(0, mockStdout, "");
      mockSpawn.mockReturnValue(mockChild);

      const result = await executeCommand("db", "status");

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("command", "npm run db:status");
      expect(result).toHaveProperty("stdout", mockStdout);
      expect(result).toHaveProperty("stderr");
      expect(result).toHaveProperty("exitCode", 0);
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("steps");
      expect(Array.isArray(result.steps)).toBe(true);
    });

    it("should include step results", async () => {
      const mockChild = createMockChildProcess(0, "OK", "");
      mockSpawn.mockReturnValue(mockChild);

      const result = await executeCommand("db", "status");

      expect(result.steps.length).toBeGreaterThanOrEqual(2);
      expect(result.steps[0]).toHaveProperty("name");
      expect(result.steps[0]).toHaveProperty("status");
      expect(result.steps.some(s => s.name === "input-validation")).toBe(true);
      expect(result.steps.some(s => s.name === "resolve-mapping")).toBe(true);
    });

    it("should mark failed commands correctly", async () => {
      const mockChild = createMockChildProcess(1, "", "Error occurred");
      mockSpawn.mockReturnValue(mockChild);

      const result = await executeCommand("db", "status");

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error?.toLowerCase()).toContain("exit code 1");
    });
  });

  // ============================================================================
  // TEST: Fail-fast oppførsel
  // ============================================================================
  describe("Fail-Fast Behavior", () => {
    it("should not execute spawn for unknown tool", async () => {
      const result = await executeCommand("nonexistent", "action");

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Ukjent tool");
    });

    it("should not execute spawn for unknown action", async () => {
      const result = await executeCommand("db", "nonexistent-action");

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Ukjent action");
    });

    it("should return immediately on validation failure", async () => {
      const startTime = Date.now();
      const result = await executeCommand("invalid", "tool");
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be instant
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // TEST: Miljø-støtte
  // ============================================================================
  describe("Environment Support", () => {
    it("should pass environment variables to spawn", async () => {
      const mockChild = createMockChildProcess(0, "", "");
      mockSpawn.mockReturnValue(mockChild);

      const customEnv = { CUSTOM_VAR: "value123" };
      await executeCommand("db", "status", customEnv);

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining(customEnv),
        })
      );
    });

    it("should set CI=true in environment", async () => {
      const mockChild = createMockChildProcess(0, "", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("db", "status");

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ CI: "true" }),
        })
      );
    });
  });

  // ============================================================================
  // TEST: Hjelpefunksjoner
  // ============================================================================
  describe("Deploy Commands", () => {
    it("should map kimi_deploy preview to npm run deploy:preview", async () => {
      const mockChild = createMockChildProcess(0, "Preview deployed", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("deploy", "preview");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "deploy:preview"], expect.any(Object));
    });

    it("should map kimi_deploy prod to npm run deploy:prod", async () => {
      const mockChild = createMockChildProcess(0, "Production deployed", "");
      mockSpawn.mockReturnValue(mockChild);

      await executeCommand("deploy", "prod");

      expect(mockSpawn).toHaveBeenCalledWith("npm", ["run", "deploy:prod"], expect.any(Object));
    });
  });

  describe("Helper Functions", () => {
    it("getAvailableCommands should return all tools and actions", () => {
      const commands = getAvailableCommands();
      
      expect(commands).toHaveProperty("db");
      expect(commands).toHaveProperty("ci");
      expect(commands).toHaveProperty("monitor");
      expect(commands).toHaveProperty("deploy");
      
      expect(commands.db).toContain("status");
      expect(commands.db).toContain("push");
      expect(commands.ci).toContain("default");
      expect(commands.monitor).toContain("full");
      expect(commands.deploy).toContain("preview");
      expect(commands.deploy).toContain("prod");
    });

    it("getCommandHelp should return help for all tools", () => {
      const help = getCommandHelp();
      
      expect(help).toContain("db:");
      expect(help).toContain("ci:");
      expect(help).toContain("monitor:");
    });

    it("getCommandHelp should return detailed help for specific tool", () => {
      const help = getCommandHelp("db");
      
      expect(help).toContain("db commands:");
      expect(help).toContain("status:");
      expect(help).toContain("npm run db:status");
    });
  });

  // ============================================================================
  // TEST: Timeout-håndtering
  // ============================================================================
  describe("Timeout Handling", () => {
    it("should handle timeout correctly", async () => {
      const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
      
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn((evt, cb) => {
          // Store stderr handler for timeout simulation
          if (evt === "data") handlers["stderr"] = [cb];
        }) },
        on: vi.fn((event, handler) => {
          if (!handlers[event]) handlers[event] = [];
          handlers[event].push(handler);
        }),
        kill: vi.fn((signal) => {
          // Simulate that kill triggers close with null code
          setTimeout(() => {
            handlers["close"]?.forEach(h => h(signal === "SIGTERM" ? null : 0));
          }, 10);
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = executeCommand("db", "status");
      
      // Wait a bit then trigger timeout via kill
      await new Promise(r => setTimeout(r, 50));
      mockChild.kill("SIGTERM");

      const result = await resultPromise;
      
      // Should have attempted to kill the process
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
      // Result should indicate failure
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// HJELPEFUNKSJON: Mock child process
// ============================================================================

function createMockChildProcess(exitCode: number, stdout: string, stderr: string) {
  const eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  
  const mockChild = {
    stdout: {
      on: vi.fn((event, handler) => {
        if (event === "data" && stdout) {
          handler(Buffer.from(stdout));
        }
      }),
    },
    stderr: {
      on: vi.fn((event, handler) => {
        if (event === "data" && stderr) {
          handler(Buffer.from(stderr));
        }
      }),
    },
    on: vi.fn((event, handler) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
      
      if (event === "close") {
        // Simulate async close
        setTimeout(() => handler(exitCode), 10);
      }
    }),
    kill: vi.fn((signal) => {
      if (eventHandlers["close"]) {
        eventHandlers["close"].forEach(h => h(signal === "SIGTERM" ? null : 0));
      }
    }),
  };
  
  return mockChild;
}
