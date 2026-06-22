import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const service: any = req.scope.resolve("support_ticket");

  const [tickets] = await service.listAndCountSupportTickets({ id }, { take: 1 });
  if (!tickets?.length) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  res.json({ ticket: tickets[0] });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const body = (req.body || {}) as Record<string, any>;
  const service: any = req.scope.resolve("support_ticket");

  const [tickets] = await service.listAndCountSupportTickets({ id }, { take: 1 });
  if (!tickets?.length) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  const updates: Record<string, any> = {};
  if (body.status) updates.status = body.status;
  if (body.priority) updates.priority = body.priority;
  if (body.assignee !== undefined) updates.assignee = body.assignee;
  if (body.notes !== undefined) updates.notes = body.notes;

  const updated = await service.updateSupportTickets({ id, ...updates });

  res.json({ ticket: updated });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const service: any = req.scope.resolve("support_ticket");

  await service.deleteSupportTickets(id);
  res.status(200).json({ message: "Ticket deleted" });
}
