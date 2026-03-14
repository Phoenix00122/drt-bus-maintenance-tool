import { Router, type IRouter } from "express";
import healthRouter from "./health";
import busesRouter from "./buses";
import pmSchedulesRouter from "./pm-schedules";
import partsRouter from "./parts";
import forecastRouter from "./forecast";
import partsBundlesRouter from "./parts-bundles";
import liveFleetRouter from "./live-fleet";

const router: IRouter = Router();

router.use(healthRouter);
router.use(busesRouter);
router.use(pmSchedulesRouter);
router.use(partsRouter);
router.use(forecastRouter);
router.use(partsBundlesRouter);
router.use(liveFleetRouter);

export default router;
