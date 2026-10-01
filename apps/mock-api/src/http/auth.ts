import type { Request, RequestHandler, Response } from "express";
import type { Store, StoredUser } from "../data/store";
import { HttpError } from "./errors";

export function tokenFrom(req: Request) {
  const header = req.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export function requireAuth(store: Store): RequestHandler {
  return (req, res, next) => {
    const token = tokenFrom(req);
    const userId = token ? store.sessions.get(token) : undefined;
    const user = userId ? store.users.get(userId) : undefined;
    if (!user) {
      next(new HttpError("UNAUTHORIZED", "Sign in to continue"));
      return;
    }
    res.locals.user = user;
    res.locals.token = token;
    next();
  };
}

export const currentUser = (res: Response) => res.locals.user as StoredUser;
