import { Router } from "express";
import {
  addSubAsset,
  getAssetTree,
  listAssetParents,
  listSubAssets,
  removeSubAsset,
} from "../controllers/subAssets.controller.js";

const router = Router();

router.get("/api/assets/:assetId/sub-assets", listSubAssets);
router.get("/api/assets/:assetId/used-in", listAssetParents);
router.get("/api/assets/:assetId/asset-tree", getAssetTree);
router.post("/api/assets/:assetId/sub-assets", addSubAsset);
router.delete(
  "/api/assets/:assetId/sub-assets/:subAssetId",
  removeSubAsset
);

export default router;
