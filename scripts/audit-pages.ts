import fs from 'fs';
import path from 'path';

interface PageAudit {
  path: string;
  category: string;
  exists: boolean;
  hasPageTsx: boolean;
  hasClientComponent: boolean;
  fileSize: number;
}

const EXPECTED_PAGES = {
  "Dashboard": [
    "/dashboard",
    "/dashboard/activity",
    "/dashboard/auto-trade",
    "/dashboard/guide",
    "/dashboard/portfolio",
    "/dashboard/referral",
    "/dashboard/settings",
    "/dashboard/tax-report",
    "/dashboard/trading",
  ],
  "Trading": [
    "/paper-trading",
    "/auto-trading",
    "/auto-trading-ai",
    "/live-trading",
    "/copy-trading",
  ],
  "Analyse": [
    "/handelshistorikk",
    "/leaderboard",
    "/varsler",
    "/signals",
  ],
  "Læring": [
    "/akademi",
    "/kurs",
    "/quiz",
    "/simulator",
    "/interessetest",
  ],
  "Konkurranser": [
    "/leagues",
    "/beta",
    "/beta-testing",
  ],
  "Profil": [
    "/profile",
    "/innstillinger",
    "/konto",
    "/settings",
  ],
  "Onboarding": [
    "/onboarding",
    "/onboarding/step1-welcome",
    "/onboarding/step2-experience",
    "/onboarding/step3-trading-mode",
    "/onboarding/step4-binance",
    "/onboarding/step5-complete",
  ],
};

function auditPage(pagePath: string, category: string): PageAudit {
  const localePath = path.join(process.cwd(), 'src', 'app', '[locale]', pagePath);
  const pageFilePath = path.join(localePath, 'page.tsx');
  const pageTsPath = path.join(localePath, 'page.ts');
  const clientFilePath = path.join(localePath, `Client${path.basename(pagePath)}.tsx`);

  const exists = fs.existsSync(localePath);
  const hasPageTsx = fs.existsSync(pageFilePath) || fs.existsSync(pageTsPath);
  const hasClientComponent = fs.existsSync(clientFilePath);
  
  let fileSize = 0;
  if (fs.existsSync(pageFilePath)) {
    const stats = fs.statSync(pageFilePath);
    fileSize = stats.size;
  } else if (fs.existsSync(pageTsPath)) {
    const stats = fs.statSync(pageTsPath);
    fileSize = stats.size;
  }

  return {
    path: pagePath,
    category,
    exists,
    hasPageTsx,
    hasClientComponent,
    fileSize,
  };
}

function generateReport() {
  console.log('🔍 Klarpakke Site Audit Report');
  console.log('='.repeat(80));
  console.log();

  const allResults: PageAudit[] = [];
  let totalPages = 0;
  let existingPages = 0;
  let missingPages = 0;
  let needsPageTsx = 0;

  for (const [category, pages] of Object.entries(EXPECTED_PAGES)) {
    console.log(`\n## ${category} (${pages.length} pages)`);
    
    for (const page of pages) {
      totalPages++;
      const audit = auditPage(page, category);
      allResults.push(audit);

      const status = audit.hasPageTsx ? '✅' : audit.exists ? '⚠️' : '❌';
      const detail = audit.hasPageTsx 
        ? `${(audit.fileSize / 1024).toFixed(1)}KB`
        : audit.exists 
          ? 'Folder exists, no page.tsx'
          : 'Missing folder';

      console.log(`${status} ${page.padEnd(40)} ${detail}`);

      if (audit.hasPageTsx) existingPages++;
      else if (audit.exists) needsPageTsx++;
      else missingPages++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   Total Expected: ${totalPages}`);
  console.log(`   ✅ Working: ${existingPages} (${((existingPages/totalPages)*100).toFixed(1)}%)`);
  console.log(`   ⚠️  Needs page.tsx: ${needsPageTsx}`);
  console.log(`   ❌ Missing folder: ${missingPages}`);

  // Write JSON report
  const reportPath = path.join(process.cwd(), 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Generate missing page stubs if needed
  const needsStub = allResults.filter(r => r.exists && !r.hasPageTsx);
  if (needsStub.length > 0) {
    console.log(`\n🔧 Pages that need page.tsx stubs:`);
    needsStub.forEach(p => console.log(`   - ${p.path}`));
  }

  // Return summary for exit code
  return { totalPages, existingPages, needsPageTsx, missingPages, allResults };
}

const result = generateReport();

// Exit with error if any issues found
if (result.needsPageTsx > 0 || result.missingPages > 0) {
  console.log('\n⚠️  Issues found! Run create-stub-pages.ts to fix.');
  process.exit(1);
} else {
  console.log('\n✨ All pages verified!');
  process.exit(0);
}
