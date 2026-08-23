import { readTrip, writeTrip } from "@/lib/db";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/expenses/[id]">
) {
  const { id } = await ctx.params;
  const data = await readTrip();
  const index = data.expenses.findIndex((e) => e.id === id);
  if (index === -1) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }
  const [removed] = data.expenses.splice(index, 1);
  await writeTrip(data);
  return Response.json(removed);
}
