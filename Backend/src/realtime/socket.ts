import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import * as storeModel from "../models/store.model.js";
import type { AccessPayload } from "../utils/jwt.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { logger } from "../utils/logger.js";
import { setIo } from "./events.js";
import { ADMIN_ROOM, storeRoom, userRoom } from "./rooms.js";

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  // Handshake auth. Runs again on every reconnect, so an expired access token means the
  // reconnect fails and the client must refresh before calling connect() again.
  io.use((socket, next) => {
    try {
      socket.data.user = verifyAccessToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as AccessPayload;

    // Rooms are assigned from the JWT, never from anything the client sends.
    await socket.join(userRoom(user.sub));
    if (user.role === "ADMIN") await socket.join(ADMIN_ROOM);
    if (user.role === "STORE_OWNER") {
      const storeIds = await storeModel.idsByOwner(user.sub);
      await Promise.all(storeIds.map((id) => socket.join(storeRoom(id))));
    }

    logger.info({ userId: user.sub, role: user.role }, "socket connected");
    socket.on("disconnect", (reason) =>
      logger.info({ userId: user.sub, reason }, "socket disconnected"),
    );
  });

  setIo(io);
  return io;
}
