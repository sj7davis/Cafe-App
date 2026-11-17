// Australian public holidays, computed from rules so the list never runs out
// (it used to be a hand-typed 2025–2026 table). Covers national days plus the
// main statewide ones; regional/half-day holidays (show days, Christmas Eve
// evenings, AFL Grand Final eve) are deliberately left out.

export type AUState = "VIC" | "NSW" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";

const STATE_TIMEZONES: Record<AUState, string> = {
  VIC: "Australia/Melbourne",
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  WA: "Australia/Perth",
  TAS: "Australia/Hobart",
  NT: "Australia/Darwin",
};

export function normaliseState(state: unknown): AUState {
  const s = typeof state === "string" ? state.toUpperCase() : "";
  return (s in STATE_TIMEZONES ? s : "VIC") as AUState;
}

export function timezoneForState(state: unknown): string {
  return STATE_TIMEZONES[normaliseState(state)];
}

/** Calendar date ("YYYY-MM-DD") and minutes-past-midnight in the venue's zone. */
export function localDateTime(now: Date, timeZone: string): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map(p => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

// ── date helpers (UTC-based so the server's own timezone never matters) ──
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** nth (1-based) given weekday (0=Sun…6=Sat) of a month; n = -1 for the last. */
function nthWeekday(y: number, m: number, weekday: number, n: number): Date {
  if (n === -1) {
    let d = utc(y, m + 1, 0);
    while (d.getUTCDay() !== weekday) d = addDays(d, -1);
    return d;
  }
  let d = utc(y, m, 1);
  while (d.getUTCDay() !== weekday) d = addDays(d, 1);
  return addDays(d, 7 * (n - 1));
}

/** Easter Sunday (anonymous Gregorian algorithm). */
function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, month, day);
}

const MON = 1, TUE = 2;

/** All public holidays for one state and year, as date → name. */
export function auPublicHolidays(year: number, stateInput: unknown = "VIC"): Map<string, string> {
  const state = normaliseState(stateInput);
  const days = new Map<string, string>();
  const add = (d: Date, name: string) => { if (!days.has(ymd(d))) days.set(ymd(d), name); };
  /** A weekend fixed-date holiday moves to the next free weekday. */
  const addObserved = (d: Date, name: string) => {
    add(d, name);
    if (!isWeekend(d)) return;
    let sub = addDays(d, 1);
    while (isWeekend(sub) || days.has(ymd(sub))) sub = addDays(sub, 1);
    add(sub, `${name} (substitute)`);
  };

  addObserved(utc(year, 1, 1), "New Year's Day");
  addObserved(utc(year, 1, 26), "Australia Day");
  const easter = easterSunday(year);
  add(addDays(easter, -2), "Good Friday");
  if (state !== "TAS" && state !== "WA") add(addDays(easter, -1), "Easter Saturday");
  if (state !== "TAS") add(easter, "Easter Sunday");
  add(addDays(easter, 1), "Easter Monday");
  add(utc(year, 4, 25), "ANZAC Day");
  addObserved(utc(year, 12, 25), "Christmas Day");
  addObserved(utc(year, 12, 26), "Boxing Day");

  // King's Birthday
  if (state === "QLD") add(nthWeekday(year, 10, MON, 1), "King's Birthday");
  else if (state === "WA") add(nthWeekday(year, 9, MON, -1), "King's Birthday");
  else add(nthWeekday(year, 6, MON, 2), "King's Birthday");

  // Labour Day (and its local names)
  if (state === "VIC") add(nthWeekday(year, 3, MON, 2), "Labour Day");
  if (state === "TAS") add(nthWeekday(year, 3, MON, 2), "Eight Hours Day");
  if (state === "WA") add(nthWeekday(year, 3, MON, 1), "Labour Day");
  if (state === "QLD") add(nthWeekday(year, 5, MON, 1), "Labour Day");
  if (state === "NT") add(nthWeekday(year, 5, MON, 1), "May Day");
  if (state === "NSW" || state === "ACT" || state === "SA") add(nthWeekday(year, 10, MON, 1), "Labour Day");

  // State-specific days
  if (state === "VIC") add(nthWeekday(year, 11, TUE, 1), "Melbourne Cup Day");
  if (state === "SA") add(nthWeekday(year, 3, MON, 2), "Adelaide Cup Day");
  if (state === "TAS") add(nthWeekday(year, 2, MON, 2), "Royal Hobart Regatta");
  if (state === "ACT") {
    add(nthWeekday(year, 3, MON, 2), "Canberra Day");
    let rec = utc(year, 5, 27);
    while (rec.getUTCDay() !== MON) rec = addDays(rec, 1);
    add(rec, "Reconciliation Day");
  }
  if (state === "WA") add(nthWeekday(year, 6, MON, 1), "Western Australia Day");
  if (state === "NT") add(nthWeekday(year, 8, MON, 1), "Picnic Day");

  return days;
}

/** The holiday name if `date` ("YYYY-MM-DD") is a public holiday in `state`. */
export function publicHolidayName(date: string, state: unknown): string | null {
  return auPublicHolidays(Number(date.slice(0, 4)), state).get(date) ?? null;
}
