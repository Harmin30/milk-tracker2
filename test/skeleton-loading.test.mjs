import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Skeleton & Performance System Suite", async (t) => {
  await t.test("Shared skeleton module and components exist on disk", () => {
    const skeletonDir = path.join(process.cwd(), "src", "components", "ui", "skeleton");
    assert.ok(fs.existsSync(skeletonDir), "Skeleton directory must exist");

    const expectedFiles = [
      "index.ts",
      "Skeleton.tsx",
      "SkeletonText.tsx",
      "SkeletonCard.tsx",
      "CategoryBreakdownSkeleton.tsx",
      "VolumeDistributionSkeleton.tsx",
      "DashboardSkeleton.tsx",
      "SummarySkeleton.tsx",
      "RecordsSkeleton.tsx",
      "BillsSkeleton.tsx",
      "ProfileSkeleton.tsx",
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(skeletonDir, file);
      assert.ok(fs.existsSync(filePath), `Skeleton component ${file} must exist`);
      const content = fs.readFileSync(filePath, "utf-8");
      assert.ok(content.length > 50, `${file} must contain valid implementation`);
    }
  });

  await t.test("Skeleton index exports all primitives and page compositions", () => {
    const indexPath = path.join(process.cwd(), "src", "components", "ui", "skeleton", "index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");

    const expectedExports = [
      "Skeleton",
      "SkeletonText",
      "SkeletonCard",
      "CategoryBreakdownSkeleton",
      "VolumeDistributionSkeleton",
      "DashboardSkeleton",
      "SummarySkeleton",
      "RecordsSkeleton",
      "BillsSkeleton",
      "ProfileSkeleton",
    ];

    for (const exp of expectedExports) {
      assert.ok(
        content.includes(`export { ${exp} }`) || content.includes(exp),
        `index.ts must export ${exp}`,
      );
    }
  });

  await t.test("Accessibility and animation classes in Skeleton primitive", () => {
    const skeletonPath = path.join(process.cwd(), "src", "components", "ui", "skeleton", "Skeleton.tsx");
    const content = fs.readFileSync(skeletonPath, "utf-8");

    // Accessibility check: aria-hidden="true" for pure decoration
    assert.ok(content.includes('aria-hidden="true"'), "Skeleton must have aria-hidden");
    // Respect prefers-reduced-motion
    assert.ok(
      content.includes("motion-safe:animate-pulse") || content.includes("animate-pulse"),
      "Must have subtle pulse animation",
    );
    assert.ok(
      content.includes("motion-reduce:animate-none"),
      "Must respect prefers-reduced-motion",
    );
  });

  await t.test("Dashboard page implements centralized DashboardSkeleton and database aggregation", () => {
    const dashPath = path.join(process.cwd(), "src", "app", "dashboard", "page.tsx");
    const content = fs.readFileSync(dashPath, "utf-8");

    assert.ok(content.includes("DashboardSkeleton"), "Dashboard must use DashboardSkeleton");
    assert.ok(content.includes("/api/summary/monthly"), "Dashboard must use /api/summary/monthly for 100% aggregation");
    assert.ok(content.includes("searchDate="), "Dashboard must use searchDate for today's records");
    assert.ok(content.includes("cachedDashboard"), "Dashboard must support client cache for instant return");
  });

  await t.test("Summary page implements centralized SummarySkeleton and monthly caching", () => {
    const summaryPath = path.join(process.cwd(), "src", "app", "summary", "page.tsx");
    const content = fs.readFileSync(summaryPath, "utf-8");

    assert.ok(content.includes("SummarySkeleton"), "Summary must use SummarySkeleton");
    assert.ok(content.includes("summaryCache"), "Summary must support client cache for instant month switching");
  });

  await t.test("Records, Bills, and Profile implement centralized skeletons", () => {
    const recordsContent = fs.readFileSync(path.join(process.cwd(), "src", "app", "records", "page.tsx"), "utf-8");
    const billsContent = fs.readFileSync(path.join(process.cwd(), "src", "app", "bills", "page.tsx"), "utf-8");
    const profileContent = fs.readFileSync(path.join(process.cwd(), "src", "app", "profile", "page.tsx"), "utf-8");

    assert.ok(recordsContent.includes("RecordsSkeleton"), "Records page must use RecordsSkeleton");
    assert.ok(billsContent.includes("BillsSkeleton"), "Bills page must use BillsSkeleton");
    assert.ok(profileContent.includes("ProfileSkeleton"), "Profile page must use ProfileSkeleton");
  });

  await t.test("Parallel query optimization in /api/summary/monthly", () => {
    const apiPath = path.join(process.cwd(), "src", "app", "api", "summary", "monthly", "route.ts");
    const content = fs.readFileSync(apiPath, "utf-8");

    assert.ok(content.includes("Promise.all"), "Monthly summary API must run database queries in parallel");
  });
});
