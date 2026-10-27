import { onRequest } from "../functions/api/[[path]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return onRequest({ request, env, ctx, params: {} });
    }

    return env.ASSETS.fetch(request);
  }
};
