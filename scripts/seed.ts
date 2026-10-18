import bcrypt from "bcryptjs";
import { createUser, countUsers } from "../src/lib/users";
import { insertPunch } from "../src/lib/punches";
import { createCorrection } from "../src/lib/corrections";
import { dayKey, parseLocalDateTime } from "../src/lib/tz";

const TZ = "Asia/Manila";
const DEMO_PASSWORD = "password123";
const ADMIN_PASSWORD = "admin123";

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function isWeekday(key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return day >= 1 && day <= 5;
}

if (countUsers() > 0) {
  console.error(
    "Database already has users. Delete data/hris.db (and data/hris.db-*) to reseed.",
  );
  process.exit(1);
}

console.log("Seeding demo data…");

const adminId = createUser({
  username: "admin",
  fullName: "Demo Admin",
  email: "admin@example.com",
  passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
  role: "admin",
});

const employees = [
  { username: "jreyes", fullName: "Juan Reyes", email: "juan@example.com" },
  { username: "asantos", fullName: "Ana Santos", email: "ana@example.com" },
  { username: "mcruz", fullName: "Miguel Cruz", email: "miguel@example.com" },
  { username: "lgarcia", fullName: "Liza Garcia", email: "liza@example.com" },
  { username: "rlim", fullName: "Roberto Lim", email: "roberto@example.com" },
].map((e) => ({
  ...e,
  id: createUser({
    ...e,
    passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    role: "employee" as const,
  }),
}));

console.log(`  admin (#${adminId}) + ${employees.length} employees created`);

let punchCount = 0;
const now = Date.now();

for (let back = 1; back <= 35; back++) {
  const dayMs = now - back * 24 * 60 * 60 * 1000;
  const key = dayKey(dayMs, TZ);
  if (!isWeekday(key)) continue;

  for (const emp of employees) {
    const skipLunch = Math.random() < 0.15;
    const missOut = Math.random() < 0.08;

    const punches: [string, string][] = [
      [`0${rand(7, 8)}`.slice(-2) + ":" + String(rand(50, 59)).padStart(2, "0"), "in"],
    ];
    // Morning in: 07:50-08:59
    punches.length = 0;
    punches.push([`${rand(7, 8)}:${String(rand(0, 59)).padStart(2, "0")}`, "in"]);
    if (!skipLunch) {
      punches.push([`12:${String(rand(0, 15)).padStart(2, "0")}`, "out"]);
      punches.push([`12:${String(rand(30, 59)).padStart(2, "0")}`, "in"]);
    }
    if (!missOut) {
      punches.push([`17:${String(rand(0, 59)).padStart(2, "0")}`, "out"]);
    }

    for (const [time] of punches) {
      const ms = parseLocalDateTime(key, time, TZ);
      if (ms >= now) continue;
      insertPunch(emp.id, ms, "192.168.1.10");
      punchCount++;
    }
  }
}

console.log(`  ${punchCount} punches inserted`);

// One pending correction: Ana Santos missed yesterday's punch-out.
const ana = employees[1];
const yesterday = dayKey(now - 24 * 60 * 60 * 1000, TZ);
if (isWeekday(yesterday)) {
  try {
    createCorrection({
      userId: ana.id,
      punchId: null,
      targetDate: yesterday,
      proposedAt: parseLocalDateTime(yesterday, "17:30", TZ),
      reason: "Forgot to punch out yesterday — I left the office at 5:30 PM.",
    });
    console.log("  1 pending correction request created");
  } catch (err) {
    console.warn("  could not create demo correction:", (err as Error).message);
  }
}

console.log("\nDone. Demo credentials:");
console.log("  Admin:    admin / admin123");
console.log("  Employee: jreyes, asantos, mcruz, lgarcia, rlim");
console.log(`  Employee password: ${DEMO_PASSWORD}`);
