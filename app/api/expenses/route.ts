import { randomUUID } from "crypto";
import { readTrip, writeTrip } from "@/lib/db";
import { CATEGORIES, type Category, type Expense, type TravelerId } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const amount = Number(body.amount);
  const category = body.category as Category;
  const payerId = body.payerId as TravelerId;
  const date = typeof body.date === "string" ? body.date : "";

  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0)
    return Response.json({ error: "Amount must be a positive number of yen" }, { status: 400 });
  if (!CATEGORIES.includes(category))
    return Response.json({ error: "Unknown category" }, { status: 400 });
  if (payerId !== "a" && payerId !== "b")
    return Response.json({ error: "Unknown payer" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return Response.json({ error: "Date must be YYYY-MM-DD" }, { status: 400 });

  const expense: Expense = {
    id: randomUUID(),
    title,
    amount: Math.round(amount),
    category,
    payerId,
    date,
    createdAt: Date.now(),
  };

  const data = await readTrip();
  data.expenses.push(expense);
  await writeTrip(data);

  return Response.json(expense, { status: 201 });
}
