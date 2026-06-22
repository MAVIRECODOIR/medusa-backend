import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const service: any = req.scope.resolve("pre_order");

  const [preOrders] = await service.listAndCountPreOrders({ id }, { take: 1 });
  if (!preOrders?.length) {
    return res.status(404).json({ message: "Pre-order not found" });
  }

  res.json({ pre_order: preOrders[0] });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const body = (req.body || {}) as Record<string, any>;
  const service: any = req.scope.resolve("pre_order");

  const [preOrders] = await service.listAndCountPreOrders({ id }, { take: 1 });
  if (!preOrders?.length) {
    return res.status(404).json({ message: "Pre-order not found" });
  }

  const updates: Record<string, any> = {};
  if (body.status) updates.status = body.status;
  if (body.eta) updates.eta = body.eta;
  if (body.notes) updates.notes = body.notes;
  if (body.deposit !== undefined) updates.deposit = body.deposit;
  if (body.total !== undefined) updates.total = body.total;

  const updated = await service.updatePreOrders({ id, ...updates });

  res.json({ pre_order: updated });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const service: any = req.scope.resolve("pre_order");

  await service.deletePreOrders(id);
  res.status(200).json({ message: "Pre-order deleted" });
}
