import { Router } from "express";
import {
  listParts,
  getPart,
  createPart,
  updatePart,
  deletePart,
  listSubParts,
  listUsedInParts,
  getPartTree,
  addSubPart,
  updateSubPart,
  removeSubPart
} from "../controllers/parts.controller.js";

const router = Router();

router.get(
  "/api/parts",
  listParts
);

router.get(
  "/api/parts/:id",
  getPart
);

router.post(
  "/api/parts",
  createPart
);

router.patch(
  "/api/parts/:id",
  updatePart
);

router.delete(
  "/api/parts/:id",
  deletePart
);

router.get(
  "/api/parts/:partId/sub-parts",
  listSubParts
);

router.get(
  "/api/parts/:partId/used-in",
  listUsedInParts
);

router.get(
  "/api/parts/:partId/part-tree",
  getPartTree
);

router.post(
  "/api/parts/:partId/sub-parts",
  addSubPart
);

router.patch(
  "/api/parts/:partId/sub-parts/:subPartId",
  updateSubPart
);

router.delete(
  "/api/parts/:partId/sub-parts/:subPartId",
  removeSubPart
);

export default router;
