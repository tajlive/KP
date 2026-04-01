import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { chain } from "./chain";

describe("chain", () => {
  it("runs all middlewares and returns final response", async () => {
    const mw1 = async (req: NextRequest, res?: NextResponse) => {
      res = res ?? NextResponse.next();
      res.headers.set("x-step", "1");
      return res;
    };
    const mw2 = async (req: NextRequest, res?: NextResponse) => {
      res = res ?? NextResponse.next();
      res.headers.set("x-step", "2");
      return res;
    };

    const req = new NextRequest(new URL("http://localhost/test"));
    const res = await chain(mw1, mw2)(req);

    expect(res.headers.get("x-step")).toBe("2");
    expect(res.status).toBe(200);
  });

  it("stops chain on terminal redirect response", async () => {
    const mw1 = async () => NextResponse.redirect(new URL("http://localhost/login"), 302);
    const mw2 = async (req: NextRequest, res?: NextResponse) => {
      res = res ?? NextResponse.next();
      res.headers.set("x-step", "should-not-exist");
      return res;
    };

    const req = new NextRequest(new URL("http://localhost/test"));
    const res = await chain(mw1, mw2)(req);

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost/login");
    expect(res.headers.get("x-step")).toBeNull();
  });

  it("stops chain on x-middleware-stop header", async () => {
    const mw1 = async () => {
      const res = NextResponse.json({ error: "stop" }, { status: 200 });
      res.headers.set("x-middleware-stop", "true");
      return res;
    };
    const mw2 = async (req: NextRequest, res?: NextResponse) => {
      res = res ?? NextResponse.next();
      res.headers.set("x-step", "should-not-exist");
      return res;
    };

    const req = new NextRequest(new URL("http://localhost/test"));
    const res = await chain(mw1, mw2)(req);

    expect(res.headers.get("x-middleware-stop")).toBe("true");
    expect(res.headers.get("x-step")).toBeNull();
  });
});
