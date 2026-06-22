import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("support_ticket");
  const { id } = req.params as { id: string };

  const ticket = await service.retrieveSupportTickets(id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  res.json({ ticket });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("support_ticket");
  const { id } = req.params as { id: string };
  const body = req.body || {};

  const ticket = await service.updateSupportTickets({ id, ...body });

  try {
    const auditLog: any = req.scope.resolve("audit_log");
    const changes = Object.keys(body).map(k => `${k}: ${body[k]}`).join(", ");
    await auditLog.createAuditLogs({
      action: "support_ticket_updated",
      entity_type: "support_ticket",
      entity_id: id,
      details: {
        title: "Support Ticket Updated",
        message: `Ticket ${id.slice(0, 8)} updated: ${changes}`,
        ...body,
      },
    });
  } catch {}

  res.json({ ticket });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("support_ticket");
  const { id } = req.params as { id: string };

  await service.softDeleteSupportTickets([id]);
  res.status(204).send();
}
