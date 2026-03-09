export const runtime = "nodejs";

import { pool } from "../../../lib/db";
import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function getUserFromToken(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, year, month, from_date, to_date } = body;

    // Fetch profile
    const profileRes = await pool.query(
      `SELECT name, address, mobile, default_cow_price, default_buffalo_price 
       FROM users WHERE id = $1`,
      [user.userId],
    );

    const profile = profileRes.rows[0];

    if (!profile || !profile.name || !profile.address || !profile.mobile) {
      return NextResponse.json(
        { error: "Please complete your profile before generating bill." },
        { status: 400 },
      );
    }

    let startDate: string;
    let endDate: string;

    if (type === "monthly") {
      if (!year || !month)
        return NextResponse.json(
          { error: "Year and month required" },
          { status: 400 },
        );

      startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    } else if (type === "custom") {
      if (!from_date || !to_date)
        return NextResponse.json(
          { error: "From and To dates required" },
          { status: 400 },
        );

      if (from_date > to_date)
        return NextResponse.json(
          { error: "Invalid date range" },
          { status: 400 },
        );

      startDate = from_date;
      endDate = to_date;
    } else {
      return NextResponse.json({ error: "Invalid bill type" }, { status: 400 });
    }

    // Fetch entries
    const entriesRes = await pool.query(
      `
      SELECT * FROM milk_entries
      WHERE user_id = $1
      AND date BETWEEN $2 AND $3
      ORDER BY date ASC
      `,
      [user.userId, startDate, endDate],
    );

    const entries = entriesRes.rows;

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No entries found for selected period" },
        { status: 400 },
      );
    }

    // Totals
    let cowLiters = 0;
    let buffaloLiters = 0;
    let cowAmount = 0;
    let buffaloAmount = 0;

    entries.forEach((e) => {
      const liters = Number(e.liters);
      const rate = Number(e.price_per_liter);
      const amount = liters * rate;

      if (e.milk_type === "cow") {
        cowLiters += liters;
        cowAmount += amount;
      } else {
        buffaloLiters += liters;
        buffaloAmount += amount;
      }
    });
    const totalLiters = cowLiters + buffaloLiters;
    const totalAmount = cowAmount + buffaloAmount;

    // Save bill record
    if (type === "monthly") {
      const existing = await pool.query(
        `SELECT id FROM bills
         WHERE user_id = $1 AND bill_type = 'monthly'
         AND year = $2 AND month = $3`,
        [user.userId, year, month],
      );

      if (existing.rowCount === 0) {
        await pool.query(
          `INSERT INTO bills
           (user_id, bill_type, year, month, from_date, to_date, total_amount)
           VALUES ($1, 'monthly', $2, $3, $4, $5, $6)`,
          [user.userId, year, month, startDate, endDate, totalAmount],
        );
      }
    } else {
      await pool.query(
        `INSERT INTO bills
         (user_id, bill_type, from_date, to_date, total_amount)
         VALUES ($1, 'custom', $2, $3, $4)`,
        [user.userId, startDate, endDate, totalAmount],
      );
    }

    // ================= FINAL CLEAN PROFESSIONAL INVOICE =================

    // ================= MODERN CLEAN PROFESSIONAL INVOICE =================

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;

    const blue = rgb(0.12, 0.28, 0.52);
    const lightGray = rgb(0.96, 0.97, 0.99);
    const borderGray = rgb(0.85, 0.88, 0.92);

    // ---------- Date Formatter ----------
    const formatDate = (dateStr: string | Date) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);

    // ---------- Outer Border ----------
    page.drawRectangle({
      x: 40,
      y: 50,
      width: 515,
      height: 740,
      borderColor: borderGray,
      borderWidth: 1,
    });

    // ---------- Header ----------
    page.drawText("Milk Bill", {
      x: 60,
      y,
      size: 22,
      font: boldFont,
      color: blue,
    });

    // Period label and dates on right
    page.drawText("Bill Period:", {
      x: 375,
      y,
      size: 10,
      font: boldFont,
      color: blue,
    });

    const periodText = `${formattedStart} - ${formattedEnd}`;
    page.drawText(periodText, {
      x: 438,
      y,
      size: 10,
      font,
    });

    y -= 25;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 555, y },
      thickness: 1,
      color: borderGray,
    });

    y -= 15;

    // ---------- Customer Info ----------
    // Name on same line as label
    page.drawText("Name:", {
      x: 60,
      y,
      size: 9,
      font: boldFont,
      color: blue,
    });

    page.drawText(profile.name, {
      x: 115,
      y,
      size: 12,
      font: boldFont,
    });

    y -= 18;

    // Address label - will be on same line as first address line
    const addressLabelY = y;

    page.drawText("Address:", {
      x: 60,
      y: addressLabelY,
      size: 9,
      font: boldFont,
      color: blue,
    });

    // Address - split into multiple lines if needed, starting from same x as value
    const maxAddressWidth = 320;
    const addressFontSize = 10;
    const addressWords = profile.address.split(" ");
    let currentLine = "";
    let addressY = addressLabelY; // Start at same y as label
    const addressStartX = 115;

    addressWords.forEach((word: string) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const lineWidth = font.widthOfTextAtSize(testLine, addressFontSize);

      if (lineWidth > maxAddressWidth && currentLine) {
        page.drawText(currentLine, {
          x: addressStartX,
          y: addressY,
          size: addressFontSize,
          font,
        });
        addressY -= 12;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      page.drawText(currentLine, {
        x: addressStartX,
        y: addressY,
        size: addressFontSize,
        font,
      });
    }

    y = addressY - 15; // Add more spacing before mobile

    // Mobile number label and value on same line
    page.drawText("Mobile:", {
      x: 60,
      y,
      size: 9,
      font: boldFont,
      color: blue,
    });

    page.drawText(profile.mobile, { x: 115, y, size: 11, font });

    y -= 18;

    // ---------- Summary Boxes ----------
    const drawBox = (
      label: string,
      liters: number,
      amount: number,
      x: number,
    ) => {
      page.drawRectangle({
        x,
        y: y - 60,
        width: 150,
        height: 55,
        color: lightGray,
        borderColor: borderGray,
        borderWidth: 1,
      });

      page.drawText(label, {
        x: x + 10,
        y: y - 20,
        size: 12,
        font: boldFont,
        color: blue,
      });

      page.drawText(`Liters: ${liters.toFixed(2)}`, {
        x: x + 10,
        y: y - 35,
        size: 10,
        font,
      });

      page.drawText(`Amount: Rs. ${amount.toFixed(2)}`, {
        x: x + 10,
        y: y - 48,
        size: 10,
        font,
      });
    };

    drawBox("Buffalo", buffaloLiters, buffaloAmount, 60);
    drawBox("Cow", cowLiters, cowAmount, 230);
    drawBox("Total", totalLiters, totalAmount, 400);

    y -= 90;

    // ---------- Table Layout ----------
    const tableLeft = 50;
    const tableRight = 555;
    const tableTop = y;
    const tableBottom = 120;

    // Column boundaries (GRID SYSTEM)
    const colDateStart = 50;
    const colLitersStart = 200;
    const colTypeStart = 290;
    const colRateStart = 360;
    const colAmountStart = 450;
    const colEnd = 555;

    // Vertical divider positions
    const columnLines = [
      colLitersStart,
      colTypeStart,
      colRateStart,
      colAmountStart,
    ];

    // ---------- Table Header ----------
    page.drawText("Date", {
      x: colDateStart + 10,
      y,
      size: 12,
      font: boldFont,
      color: blue,
    });

    page.drawText("Liters", {
      x: colLitersStart + 10,
      y,
      size: 12,
      font: boldFont,
      color: blue,
    });

    page.drawText("Type", {
      x: colTypeStart + 10,
      y,
      size: 12,
      font: boldFont,
      color: blue,
    });

    page.drawText("Rate", {
      x: colRateStart + 10,
      y,
      size: 12,
      font: boldFont,
      color: blue,
    });

    page.drawText("Amount", {
      x: colAmountStart + 10,
      y,
      size: 12,
      font: boldFont,
      color: blue,
    });

    y -= 10;

    // Header underline
    page.drawLine({
      start: { x: tableLeft, y },
      end: { x: tableRight, y },
      thickness: 1,
      color: borderGray,
    });

    y -= 18;

    // ---------- Table Rows ----------
    const rowHeight = 18;

    entries.forEach((e) => {
      const formattedType =
        e.milk_type.charAt(0).toUpperCase() + e.milk_type.slice(1);

      const liters = Number(e.liters).toFixed(2);
      const rate = Number(e.price_per_liter).toFixed(2);
      const amount = (Number(e.liters) * Number(e.price_per_liter)).toFixed(2);

      const rateText = `Rs. ${rate}`;
      const amountText = `Rs. ${amount}`;

      // Draw row text
      page.drawText(formatDate(e.date), {
        x: colDateStart + 10,
        y,
        size: 11,
        font,
      });

      page.drawText(liters, {
        x: colTypeStart - 10 - font.widthOfTextAtSize(liters, 11),
        y,
        size: 11,
        font,
      });

      page.drawText(formattedType, {
        x: colTypeStart + 10,
        y,
        size: 11,
        font,
      });

      page.drawText(rateText, {
        x: colAmountStart - 10 - font.widthOfTextAtSize(rateText, 11),
        y,
        size: 11,
        font,
      });

      page.drawText(amountText, {
        x: colEnd - 15 - font.widthOfTextAtSize(amountText, 11),
        y,
        size: 11,
        font,
      });

      // Move down EXACT row height
      y -= rowHeight;

      // Draw separator EXACTLY at new y
      page.drawLine({
        start: { x: tableLeft, y },
        end: { x: tableRight, y },
        thickness: 0.5,
        color: rgb(0.92, 0.94, 0.97),
      });
    });

    // ---------- Vertical Column Lines (DRAW AFTER ROWS) ----------
    const tableEndY = y; // last row separator position

    columnLines.forEach((xPos) => {
      page.drawLine({
        start: { x: xPos, y: tableTop - 5 }, // header top
        end: { x: xPos, y: tableEndY }, // last row bottom
        thickness: 0.6,
        color: rgb(0.88, 0.9, 0.94),
      });
    });

    // ---------- Total Line ----------
    page.drawLine({
      start: { x: 50, y },
      end: { x: 555, y },
      thickness: 1,
      color: borderGray,
    });

    y -= 20;

    page.drawRectangle({
      x: 50,
      y: y - 30,
      width: 505,
      height: 35,
      color: rgb(0.93, 0.96, 1),
    });

    const totalText = `Total Bill: Rs. ${totalAmount.toFixed(2)}`;

    page.drawText(totalText, {
      x: 540 - boldFont.widthOfTextAtSize(totalText, 16),
      y: y - 20,
      size: 16,
      font: boldFont,
      color: blue,
    });

    // ---------- Footer ----------
    page.drawText("Thank you for using Milk Tracker!", {
      x: 45,
      y: 55,
      size: 11,
      font,
    });

    // Save PDF

    const pdfBytes = await pdfDoc.save();

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=bill.pdf",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
