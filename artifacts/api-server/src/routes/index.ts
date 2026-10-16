import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import storageRouter from "./storage";
import meetingsRouter from "./meetings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(meetingsRouter);

export default router;
