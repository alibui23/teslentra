import { Router } from "express";
import {
  listLocations,
  createLocation
} from "../controllers/locations.controller.js";

const router = Router();

router.get(
  "/api/locations",
  listLocations
);

router.post(
  "/api/locations",
  createLocation
);

export default router;
