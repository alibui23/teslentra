import { Router } from "express";
import {
  createAssetComment,
  deleteAssetComment,
  listAssetComments,
  updateAssetComment,
} from "../controllers/comments.controller.js";

const router = Router();

router.get("/api/assets/:id/comments", listAssetComments);
router.post("/api/assets/:id/comments", createAssetComment);
router.put("/api/comments/:commentId", updateAssetComment);
router.delete("/api/comments/:commentId", deleteAssetComment);

export default router;
