import { Router } from "express";
import {
  checkinAsset,
  checkoutAsset,
  getAssetHistory,
} from "../controllers/checkouts.controller.js";

const router = Router();

router.get("/api/assets/:id/history", getAssetHistory);
router.post("/api/assets/:id/checkout", checkoutAsset);
router.post("/api/assets/:id/checkin", checkinAsset);

export default router;
