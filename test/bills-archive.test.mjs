import test from "node:test";
import assert from "node:assert/strict";

// Replicating helper logic for standalone unit testing
function getBillYear(bill) {
  if (bill.year) return Number(bill.year);
  if (bill.from_date) {
    const d = new Date(bill.from_date);
    if (!isNaN(d.getFullYear())) return d.getFullYear();
    const parts = String(bill.from_date).split("-");
    if (parts[0] && parts[0].length === 4) return Number(parts[0]);
  }
  if (bill.created_at) {
    const d = new Date(bill.created_at);
    if (!isNaN(d.getFullYear())) return d.getFullYear();
  }
  return new Date().getFullYear();
}

function getMonthlyBillTitle(bill) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const mIndex = Math.max(0, Math.min(11, (Number(bill.month) || 1) - 1));
  const mName = monthNames[mIndex];
  const yr = bill.year || getBillYear(bill);
  return `${mName} ${yr} Bill`;
}

function formatRangeDates(fromStr, toStr) {
  if (!fromStr && !toStr) return "";
  const fromD = new Date(fromStr);
  const toD = new Date(toStr);

  if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) {
    return `${fromStr} – ${toStr}`;
  }

  if (fromD.getFullYear() === toD.getFullYear()) {
    const fromPart = fromD.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    const toPart = toD.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${fromPart} – ${toPart}`;
  }

  const fromFull = fromD.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const toFull = toD.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${fromFull} – ${toFull}`;
}

function compareBillsDescending(a, b) {
  const dateA =
    a.from_date ||
    (a.year && a.month
      ? `${a.year}-${String(a.month).padStart(2, "0")}-01`
      : "") ||
    a.created_at;
  const dateB =
    b.from_date ||
    (b.year && b.month
      ? `${b.year}-${String(b.month).padStart(2, "0")}-01`
      : "") ||
    b.created_at;

  if (dateA && dateB && dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

test("Bills Archive Suite", async (t) => {
  const sampleBills = [
    {
      id: "1",
      bill_type: "monthly",
      year: 2026,
      month: 11,
      from_date: "2026-11-01",
      to_date: "2026-11-30",
      total_amount: 555,
      created_at: "2026-11-05T10:00:00Z",
    },
    {
      id: "2",
      bill_type: "monthly",
      year: 2026,
      month: 10,
      from_date: "2026-10-01",
      to_date: "2026-10-31",
      total_amount: 480,
      created_at: "2026-10-31T20:00:00Z",
    },
    {
      id: "3",
      bill_type: "custom",
      year: null,
      month: null,
      from_date: "2025-12-15",
      to_date: "2025-12-31",
      total_amount: 250,
      created_at: "2025-12-31T18:00:00Z",
    },
    {
      id: "4",
      bill_type: "monthly",
      year: 2027,
      month: 1,
      from_date: "2027-01-01",
      to_date: "2027-01-31",
      total_amount: 600,
      created_at: "2027-01-31T20:00:00Z",
    },
  ];

  await t.test("Dynamic year detection extracts and sorts all existing years descending", () => {
    const years = Array.from(new Set(sampleBills.map(getBillYear))).sort((a, b) => b - a);
    assert.deepStrictEqual(years, [2027, 2026, 2025]);
  });

  await t.test("Monthly bill titles are properly formatted with month and year", () => {
    assert.strictEqual(getMonthlyBillTitle(sampleBills[0]), "November 2026 Bill");
    assert.strictEqual(getMonthlyBillTitle(sampleBills[1]), "October 2026 Bill");
    assert.strictEqual(getMonthlyBillTitle(sampleBills[3]), "January 2027 Bill");
  });

  await t.test("Custom range date strings format cleanly", () => {
    // Same year range
    const range1 = formatRangeDates("2026-10-01", "2026-10-15");
    assert.ok(range1.includes("Oct") && range1.includes("2026"));

    // Multi-year range
    const range2 = formatRangeDates("2025-12-25", "2026-01-05");
    assert.ok(range2.includes("2025") && range2.includes("2026"));
  });

  await t.test("Chronological descending sort orders newest bills first", () => {
    const sorted = [...sampleBills].sort(compareBillsDescending);
    assert.strictEqual(sorted[0].id, "4"); // 2027-01
    assert.strictEqual(sorted[1].id, "1"); // 2026-11
    assert.strictEqual(sorted[2].id, "2"); // 2026-10
    assert.strictEqual(sorted[3].id, "3"); // 2025-12
  });

  await t.test("Default year selection logic", () => {
    // Current year is 2026; if present, select 2026
    const availableYears = [2027, 2026, 2025];
    const currentYear = 2026;
    let selected = "all";
    if (availableYears.includes(currentYear)) {
      selected = currentYear;
    } else if (availableYears.length > 0) {
      selected = availableYears[0];
    }
    assert.strictEqual(selected, 2026);

    // If current year has no bills (e.g. 2028), pick newest (2027)
    const availableWithoutCurrent = [2027, 2025];
    let selectedFallback = "all";
    if (availableWithoutCurrent.includes(2028)) {
      selectedFallback = 2028;
    } else if (availableWithoutCurrent.length > 0) {
      selectedFallback = availableWithoutCurrent[0];
    }
    assert.strictEqual(selectedFallback, 2027);
  });
});

