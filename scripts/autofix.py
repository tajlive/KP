#!/usr/bin/env python3
import os, sys, subprocess
from pathlib import Path

class Fixer:
    def __init__(self):
        self.repo = Path.home() / "klarpakke"
        os.chdir(self.repo)

    def fix_file(self, filepath, replacements):
        p = Path(filepath)
        if not p.exists():
            return False
        content = p.read_text()
        for old, new in replacements:
            content = content.replace(old, new)
        p.write_text(content)
        return True

    def run(self):
        print("\n🚀 KLARPAKKE AUTO-FIX\n")
        
        # 1-5: All fixes
        self.fix_file("app/api/risk-calculator/route.ts", [("parseFloat(riskScore)", "riskScore")])
        for f in ["src/components/auth/LoginForm.tsx", "src/components/auth/RegisterForm.tsx"]:
            self.fix_file(f, [('variant="danger"', 'variant="destructive"')])
        for f in Path("src").rglob("*.tsx"):
            if "auth" not in str(f):
                self.fix_file(str(f), [('variant="destructive"', 'variant="danger"')])
        self.fix_file("src/components/PaperTradingDashboard.tsx", [
            ("${10000.toLocaleString", "${ (10000).toLocaleString"),
            ("account.current_balance", "(account.balance ?? 0)"),
        ])
        Path("next.config.js").write_text("""/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};
export default nextConfig;""")
        
        print("✅ Fixes applied, building...")
        subprocess.run("npm run build", shell=True)
        subprocess.run("git add . && git commit -m '🏗️ Auto-fix: Build errors'", shell=True)
        print("✅ Done!\n")

if __name__ == "__main__":
    Fixer().run()
