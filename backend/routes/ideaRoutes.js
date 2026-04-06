import express from "express";
import {
  generateIdeas,
  listMyIdeaSets,
  getIdeaSetById,
} from "../controllers/ideaController.js";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate", optionalProtect, generateIdeas);

router.get("/", protect, listMyIdeaSets);
router.get("/:id", protect, getIdeaSetById);

export default router;
