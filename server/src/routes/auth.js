import { Router } from "express";
import { login, getMe, getUsers, register, switchDemoRole } from "../controllers/authController.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/register", asyncHandler(register));
router.post("/switch-role", asyncHandler(switchDemoRole));
router.get("/me", requireAuth, asyncHandler(getMe));
router.get("/users", requireAuth, allowRoles("AUTHORITY_ADMIN", "DEPOT_OFFICER"), asyncHandler(getUsers));

export default router;
