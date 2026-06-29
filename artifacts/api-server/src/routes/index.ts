import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import schemaRouter from "./schema";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schemaRouter);
router.use(adminRouter);

export default router;
