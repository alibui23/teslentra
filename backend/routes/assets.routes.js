import { Router } from "express";
import {
  createAsset,
  deleteAsset,
  getAsset,
  listAssets,
  updateAsset,
} from "../controllers/assets.controller.js";

const router = Router();

router.get("/api/assets", listAssets);
router.get("/api/assets/:id", getAsset);
router.post("/api/assets", createAsset);
router.patch("/api/assets/:id", updateAsset);
router.put("/api/assets/:id", updateAsset);
router.delete("/api/assets/:id", deleteAsset);

export default router;
