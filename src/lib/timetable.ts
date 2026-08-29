// Pure helpers safe for both client and server
export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DayOfWeek = (typeof DAYS)[number];

export const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Artificial Intelligence & ML",
] as const;

export const SECTIONS = ["A", "B", "C"] as const;

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return h * 60 + (m || 0);
}

export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function currentDayName(date = new Date()): DayOfWeek {
  const map: (DayOfWeek | "sunday")[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const d = map[date.getDay()];
  return d === "sunday" ? "monday" : d;
}

export function currentTimeHHMM(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}
