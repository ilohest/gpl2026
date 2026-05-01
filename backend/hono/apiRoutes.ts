// backend/hono/apiRoutes.ts
import { Hono } from "hono";
import type {} from "./context.js";
import { registerAgendaRoutes } from "./routes/agenda.routes.js";
import { registerAdminRoutes } from "./routes/admin.routes.js";
import { registerBlogRoutes } from "./routes/blog.routes.js";
import { registerEmailsRoutes } from "./routes/emails.routes.js";
import { registerFinancesRoutes } from "./routes/finances.routes.js";
import { registerGuestDirectoryRoutes } from "./routes/guestDirectory.routes.js";
import { registerMeRoutes } from "./routes/me.routes.js";
import { registerMenusSeatingRoutes } from "./routes/menusSeating.routes.js";
import { registerPlaylistRoutes } from "./routes/playlist.routes.js";
import { registerRsvpRoutes } from "./routes/rsvp.routes.js";
import { registerSessionRoutes } from "./routes/session.routes.js";
import { registerSuperadminRoutes } from "./routes/superadmin.routes.js";
import { registerSystemRoutes } from "./routes/system.routes.js";

type ReadyGetter = () => boolean;

export function createApiRoutes(getReady: ReadyGetter) {
  const api = new Hono();

  registerSystemRoutes(api, { getReadyState: getReady });
  registerSessionRoutes(api);
  registerGuestDirectoryRoutes(api);
  registerMeRoutes(api);
  registerAdminRoutes(api);
  registerSuperadminRoutes(api);
  registerRsvpRoutes(api);
  registerBlogRoutes(api);
  registerEmailsRoutes(api);
  registerPlaylistRoutes(api);
  registerAgendaRoutes(api);
  registerFinancesRoutes(api);
  registerMenusSeatingRoutes(api);

  return api;
}

export type AppType = ReturnType<typeof createApiRoutes>;
