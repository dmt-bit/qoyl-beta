import { CalendarDay, WashDayType } from "@/lib/routineCalendar";
import { RoutineProduct } from "@/lib/routineProducts";
import { SeasonalNote } from "@/lib/routineSeasonalNote";
import { RoutineStep } from "@/lib/routineSteps";

export type RoutineEmailData = {
  firstName: string;
  monthLabel: string; // e.g. "July 2026"
  monthShort: string; // e.g. "July"
  curlTypeLabel: string | null; // e.g. "4b"
  porosityLabel: string | null; // e.g. "high"
  scalpConditionLabel: string | null; // e.g. "normal"
  cityStateLabel: string | null; // e.g. "Chicago, IL"
  waterHardnessLabel: string | null; // e.g. "hard water"
  calendarDays: CalendarDay[];
  steps: RoutineStep[];
  products: RoutineProduct[];
  seasonalNote: SeasonalNote;
  dashboardUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const WASH_TAG_LABEL: Record<WashDayType, string> = {
  chelate: "Chelating",
  wash: "Wash",
  protein: "Protein",
};

function renderCalendarGrid(calendarDays: CalendarDay[]): string {
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    .map((label) => `<div class="cal-day-label">${label}</div>`)
    .join("");

  const leadingEmpty = calendarDays[0]?.weekday ?? 0;
  const totalCells = leadingEmpty + calendarDays.length;
  const trailingEmpty = (7 - (totalCells % 7)) % 7;

  const leadingCells = Array(leadingEmpty)
    .fill('<div class="cal-day empty"></div>')
    .join("");
  const trailingCells = Array(trailingEmpty)
    .fill('<div class="cal-day empty"></div>')
    .join("");

  const dayCells = calendarDays
    .map(({ day, washType }) => {
      if (!washType) {
        return `<div class="cal-day"><div class="day-num">${day}</div><div class="day-dot"></div></div>`;
      }
      return `<div class="cal-day ${washType}"><div class="day-num">${day}</div><div class="day-tag">${WASH_TAG_LABEL[washType]}</div></div>`;
    })
    .join("");

  return `<div class="cal-grid">${dayLabels}${leadingCells}${dayCells}${trailingCells}</div>`;
}

function renderSteps(steps: RoutineStep[]): string {
  return steps
    .map(
      (step, i) => `
  <div class="step">
    <div class="step-num">${i + 1}</div>
    <div>
      <div class="step-title">${escapeHtml(step.title)}</div>
      <div class="step-body">${escapeHtml(step.body)}</div>
      <div class="step-why">${escapeHtml(step.why)}</div>
    </div>
  </div>`
    )
    .join("");
}

function scoreFillClass(score: number): string {
  if (score >= 70) return "score-fill-g";
  if (score >= 40) return "score-fill-a";
  return "score-fill-r";
}

// No real product/brand catalog exists yet (Phase 1) -- these read as
// guidance ("look for a cleanser with X") rather than a specific product
// name, so nothing implies a real shoppable item that doesn't exist.
const CATEGORY_NOUN: Record<string, string> = {
  chelating_shampoo: "chelating shampoo",
  regular_shampoo: "cleanser",
  deep_conditioner: "deep conditioner",
  leave_in: "leave-in conditioner",
  styler: "styler",
  sealing_oil: "sealing oil",
};

function renderProducts(products: RoutineProduct[]): string {
  return products
    .map((product) => {
      if (!product.ingredientName || product.score === null) {
        return `
  <div class="product-card">
    <div class="product-cat">${escapeHtml(product.categoryLabel)}</div>
    <div class="product-why">No match found yet for this category.</div>
  </div>`;
      }

      const noun = CATEGORY_NOUN[product.category] ?? "product";

      return `
  <div class="product-card">
    <div class="product-cat">${escapeHtml(product.categoryLabel)}</div>
    <div class="product-guidance">Look for a ${escapeHtml(noun)} with <strong>${escapeHtml(product.ingredientName)}</strong> as a primary ingredient.</div>
    ${product.reason ? `<div class="product-why">${escapeHtml(product.reason)}</div>` : ""}
    <div class="score-row">
      <div class="score-bar"><div class="${scoreFillClass(product.score)}" style="width:${product.score}%"></div></div>
      <span class="score-num">${product.score}/100 for your profile</span>
    </div>
    <a href="${product.affiliateLink}" class="shop-btn">Shop this product &rarr;</a>
  </div>`;
    })
    .join("");
}

function renderSeasonalNote(seasonalNote: SeasonalNote): string {
  const items = seasonalNote.items
    .map((item) => `<div class="seasonal-item">${escapeHtml(item)}</div>`)
    .join("");

  return `
  <div class="seasonal">
    <div class="seasonal-title">${escapeHtml(seasonalNote.title)}</div>
    ${items}
  </div>`;
}

function renderChips(data: RoutineEmailData): string {
  const chips: string[] = [];
  if (data.curlTypeLabel) chips.push(`${data.curlTypeLabel} coily`);
  if (data.porosityLabel) chips.push(`${data.porosityLabel} porosity`);
  if (data.scalpConditionLabel) chips.push(`${data.scalpConditionLabel} scalp`);
  if (data.cityStateLabel) chips.push(data.cityStateLabel);
  if (data.waterHardnessLabel) chips.push(data.waterHardnessLabel);

  return chips
    .map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`)
    .join("");
}

export function renderRoutineEmailHtml(data: RoutineEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Your Qoyl Routine — ${escapeHtml(data.monthLabel)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#F0EBE3;font-family:Arial,sans-serif;padding:20px}
.email{max-width:600px;margin:0 auto;background:white}
.top-bar{height:4px;background:linear-gradient(90deg,#9C7B5A,#C4A882,#9C7B5A)}
.header{background:#1C1612;padding:28px 32px}
.wordmark{font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F5F0EA}
.wordmark span{color:#C4A882;font-style:italic}
.header-sub{font-size:11px;color:#9C7B5A;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
.hero{background:#1C1612;padding:0 32px 28px}
.hero-name{font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F5F0EA;font-style:italic}
.hero-sub{font-size:13px;color:#7A6A5A;margin-top:4px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.chip{font-size:10px;background:#2C2420;color:#C4A882;padding:3px 10px;border-radius:20px;letter-spacing:1px;text-transform:uppercase}
.body{padding:28px 32px}
.section-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9C7B5A;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.section-label::before{content:'';display:block;width:14px;height:1.5px;background:#9C7B5A}
.section-title{font-family:Georgia,serif;font-size:18px;font-weight:300;color:#1C1612;margin-bottom:16px}
.rule{height:1px;background:#EDE5D8;margin:24px 0}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:8px}
.cal-day-label{font-size:9px;font-weight:700;text-align:center;color:#9C8070;padding:4px 0;letter-spacing:1px}
.cal-day{min-height:52px;border-radius:4px;padding:4px;background:#FDFAF8;border:1px solid #F0EBE3}
.cal-day.empty{background:transparent;border-color:transparent}
.cal-day.wash{background:#1C1612;border-color:#1C1612}
.cal-day.chelate{background:#1C1612;border-color:#9C7B5A;border-width:2px}
.cal-day.protein{background:#1C1612;border-color:#5BA67A;border-width:2px}
.day-num{font-size:10px;font-weight:600;color:#1C1612}
.wash .day-num,.chelate .day-num,.protein .day-num{color:#F5F0EA}
.day-tag{font-size:8px;color:#9C7B5A;margin-top:2px;line-height:1.3}
.wash .day-tag{color:#9C7B5A}
.chelate .day-tag{color:#C4A882}
.protein .day-tag{color:#9DE8B0}
.day-dot{width:5px;height:5px;border-radius:50%;background:#D4C4AD;margin-top:auto}
.legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
.leg{display:flex;align-items:center;gap:5px;font-size:10px;color:#7A6A5A}
.leg-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}
.step{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #F5F0EA}
.step:last-child{border-bottom:none}
.step-num{width:28px;height:28px;border-radius:50%;background:#1C1612;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:12px;color:#C4A882;flex-shrink:0;margin-top:2px}
.step-title{font-size:13px;font-weight:600;color:#1C1612;margin-bottom:3px}
.step-body{font-size:12px;color:#5A4A3A;line-height:1.6}
.step-why{font-size:11px;color:#9C7B5A;background:#F5F0EA;padding:2px 8px;border-radius:4px;display:inline-block;margin-top:4px}
.product-card{background:#FDFAF8;border:1px solid #EDE5D8;border-radius:8px;padding:12px;margin-bottom:8px}
.product-cat{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9C7B5A;margin-bottom:4px}
.product-guidance{font-size:13px;color:#1C1612;line-height:1.5;margin-bottom:6px}
.product-guidance strong{font-weight:600}
.product-why{font-size:11px;color:#5A4A3A;line-height:1.55;margin-bottom:6px}
.score-row{display:flex;align-items:center;gap:8px}
.score-bar{width:80px;height:4px;background:#EDE5D8;border-radius:2px;overflow:hidden}
.score-fill-g{height:100%;background:#5BA67A;border-radius:2px}
.score-fill-a{height:100%;background:#D4893A;border-radius:2px}
.score-fill-r{height:100%;background:#D05555;border-radius:2px}
.score-num{font-size:11px;font-weight:600;color:#1C1612}
.shop-btn{display:inline-block;background:#1C1612;color:#F5F0EA;border-radius:6px;padding:6px 14px;font-size:11px;font-weight:500;text-decoration:none;margin-top:8px}
.seasonal{background:#1C1612;border-radius:8px;padding:14px 16px;margin-top:16px}
.seasonal-title{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9C7B5A;margin-bottom:8px}
.seasonal-item{font-size:12px;color:#C4A882;line-height:1.6;padding:4px 0;border-bottom:1px solid #2C2420}
.seasonal-item:last-child{border-bottom:none}
.footer{background:#1C1612;padding:16px 32px;margin-top:0}
.footer-text{font-size:10px;color:#5A4A3A;line-height:1.8}
.footer-logo{font-family:Georgia,serif;font-size:14px;color:#C4A882;font-style:italic;margin-bottom:6px}
</style>
</head>
<body>
<div class="email">
<div class="top-bar"></div>

<div class="header">
  <div class="wordmark">Q<span>oyl</span></div>
  <div class="header-sub">Monthly Routine &middot; ${escapeHtml(data.monthLabel)}</div>
</div>

<div class="hero">
  <div class="hero-name">${escapeHtml(data.firstName)} &mdash; your ${escapeHtml(data.monthShort)} routine.</div>
  <div class="hero-sub">Built for your hair. Updated every month.</div>
  <div class="chips">${renderChips(data)}</div>
</div>

<div class="body">

  <div class="section-label">30-day wash day calendar</div>
  <div class="section-title">${escapeHtml(data.monthLabel)} &mdash; your schedule</div>

  ${renderCalendarGrid(data.calendarDays)}

  <div class="legend">
    <div class="leg"><div class="leg-dot" style="background:#1C1612;border:2px solid #9C7B5A"></div>Chelating wash</div>
    <div class="leg"><div class="leg-dot" style="background:#1C1612"></div>Regular wash</div>
    <div class="leg"><div class="leg-dot" style="background:#1C1612;border:2px solid #5BA67A"></div>Protein treatment</div>
    <div class="leg"><div class="leg-dot" style="background:#D4C4AD;border-radius:50%"></div>Seal ends nightly</div>
  </div>

  <div class="rule"></div>

  <div class="section-label">your wash day routine</div>
  <div class="section-title">Step by step &mdash; every wash day</div>

  ${renderSteps(data.steps)}

  <div class="rule"></div>

  <div class="section-label">your curated product list</div>
  <div class="section-title">Top picks for your profile &middot; ${escapeHtml(data.monthLabel)}</div>

  ${renderProducts(data.products)}

  ${renderSeasonalNote(data.seasonalNote)}

</div>

<div class="footer">
  <div class="footer-logo">Qoyl</div>
  <div class="footer-text">
    ${escapeHtml(data.firstName)} &middot; Monthly Routine Subscriber &middot; ${escapeHtml(data.monthLabel)}<br/>
    Built from your ${data.curlTypeLabel ? escapeHtml(data.curlTypeLabel) + " " : ""}${data.porosityLabel ? escapeHtml(data.porosityLabel) + " porosity " : ""}profile${data.cityStateLabel ? " &middot; " + escapeHtml(data.cityStateLabel) : ""}${data.waterHardnessLabel ? " &middot; " + escapeHtml(data.waterHardnessLabel) : ""}<br/>
    Questions about your routine? Reply to this email &mdash; hey@qoyl.live<br/>
    Manage your subscription at ${escapeHtml(data.dashboardUrl)}
  </div>
</div>

</div>
</body>
</html>
`;
}
