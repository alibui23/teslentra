import { Router } from "express";
import assetTypesRoutes from "./assetTypes.routes.js";
import assetsRoutes from "./assets.routes.js";
import checkoutsRoutes from "./checkouts.routes.js";
import commentsRoutes from "./comments.routes.js";
import contextTagsRoutes from "./contextTags.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import healthRoutes from "./health.routes.js";
import locationsRoutes from "./locations.routes.js";
import partsRoutes from "./parts.routes.js";
import subAssetsRoutes from "./subAssets.routes.js";

const router = Router();

router.use(healthRoutes);
router.use(dashboardRoutes);
router.use(partsRoutes);
router.use(locationsRoutes);
router.use(assetTypesRoutes);
router.use(contextTagsRoutes);
router.use(assetsRoutes);
router.use(checkoutsRoutes);
router.use(commentsRoutes);
router.use(subAssetsRoutes);

export default router;
