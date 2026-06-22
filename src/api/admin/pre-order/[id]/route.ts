import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("pre_order");
  const { id } = req.params as { id: string };

  const preOrder = await service.retrievePreOrders(id);
  if (!preOrder) return res.status(404).json({ message: "Pre-order not found" });

  res.json({ pre_order: preOrder });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("pre_order");
  const { id } = req.params as { id: string };
  const body = req.body || {};

  const preOrder = await service.updatePreOrders({ id, ...body });

  try {
    const auditLog: any = req.scope.resolve("audit_log");
    await auditLog.createAuditLogs({
      action: "pre_order_status",
      entity_type: "pre_order",
      entity_id: id,
      details: {
        title: "Pre-order Updated",
        message: `Pre-order ${id.slice(0, 8)} status changed`,
        ...body,
      },
    });
  } catch {}

  res.json({ pre_order: preOrder });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve("pre_order");
  const { id } = req.params as { id: string };

  await service.softDeletePreOrders([id]);
  res.status(204).send();
}
