import { Router } from "express";
import { analyticsRouter } from "./analytics.routes.js";
import { archiveRouter } from "./archive.routes.js";
import { authRouter } from "./auth.routes.js";
import { itemRouter } from "./item.routes.js";
import { orderRouter } from "./order.routes.js";
import { storeRouter } from "./store.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/stores", storeRouter);
apiRouter.use("/items", itemRouter);
apiRouter.use("/orders", orderRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/archive-old-orders", archiveRouter);
