import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import schemaRouter from "./schema";
import membersRouter from "./members";
import paymentsRouter from "./payments";
import announcementsRouter from "./announcements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schemaRouter);
router.use(adminRouter);
router.use(membersRouter);
router.use(paymentsRouter);
router.use(announcementsRouter);

export default router;
