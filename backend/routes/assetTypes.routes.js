import { Router } from "express";
import {
  listAssetTypes,
  createAssetType
} from "../controllers/assetTypes.controller.js";

const router = Router();

router.get(
  "/api/asset-types",
  listAssetTypes
);

router.post(
  "/api/asset-types",
  createAssetType
);

export default router;
