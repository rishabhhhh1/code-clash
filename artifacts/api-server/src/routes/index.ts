import { Router, type IRouter } from "express";
import usersRouter from "./users";
import roomsRouter from "./rooms";
import battlesRouter from "./battles";
import problemsRouter from "./problems";
import leaderboardRouter from "./leaderboard";
import lobbyRouter from "./lobby";
import friendsRouter from "./friends";
import achievementsRouter from "./achievements";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.use(usersRouter);
router.use(roomsRouter);
router.use(battlesRouter);
router.use(problemsRouter);
router.use(leaderboardRouter);
router.use(lobbyRouter);
router.use(friendsRouter);
router.use(achievementsRouter);

export default router;
