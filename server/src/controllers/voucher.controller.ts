import type { Request, Response } from "express";
import {
  createVoucher,
  deleteVoucher,
  listVouchers,
  updateVoucher,
  validateVoucher,
  type VoucherInput,
} from "../services/voucher.service.js";

export async function publicValidateVoucher(req: Request, res: Response): Promise<void> {
  try {
    const result = await validateVoucher(req.body?.code, req.body?.subtotal);
    res.status(result.valid ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Không thể kiểm tra voucher",
    });
  }
}

export async function adminListVouchers(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await listVouchers());
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Không thể lấy voucher",
    });
  }
}

export async function adminCreateVoucher(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await createVoucher(req.body as VoucherInput));
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Không thể tạo voucher",
    });
  }
}

export async function adminUpdateVoucher(req: Request, res: Response): Promise<void> {
  try {
    const voucher = await updateVoucher(
      String(req.params.id ?? ""),
      req.body as VoucherInput,
    );
    if (!voucher) {
      res.status(404).json({ message: "Không tìm thấy voucher" });
      return;
    }
    res.status(200).json(voucher);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Không thể cập nhật voucher",
    });
  }
}

export async function adminDeleteVoucher(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await deleteVoucher(String(req.params.id ?? ""));
    if (!deleted) {
      res.status(404).json({ message: "Không tìm thấy voucher" });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Không thể xóa voucher",
    });
  }
}
