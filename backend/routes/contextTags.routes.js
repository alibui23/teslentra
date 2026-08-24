import { Router } from "express";
import {
  listContextTags,
  listAssetContextTags,
  createContextTag,
  deleteContextTag,
  deleteAssetContextTag
} from "../controllers/contextTags.controller.js";

const router = Router();

router.get(
  "/api/context_tag",
  listContextTags
);

router.get(
  "/api/assets/:id/context_tag",
  listAssetContextTags
);

router.post(
  "/api/context_tag",
  createContextTag
);

router.delete(
  "/api/context_tag/:contextTagId",
  deleteContextTag
);

router.delete(
  "/api/assets/:assetId/context_tag/:contextTagId",
  deleteAssetContextTag
);

export default router;
