import express, { Request, Response } from "express";
import "reflect-metadata";

import { getParamNames } from "./utils";

export type HttpMethod = "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

/**
 * This class an abstraction over the express router, used to decorate methods in your concept classes.
 * It will automatically convert actions into express handlers.
 */
export class Router {
  public readonly expressRouter = express.Router();

  constructor() {}

  public registerRoute(method: HttpMethod, path: string, action: Function) {
    this.expressRouter[method](path, this.makeRoute(action));
  }

  public all(path: string, action: Function) {
    this.registerRoute("all", path, action);
  }
  public get(path: string, action: Function) {
    this.registerRoute("get", path, action);
  }
  public post(path: string, action: Function) {
    this.registerRoute("post", path, action);
  }
  public put(path: string, action: Function) {
    this.registerRoute("put", path, action);
  }
  public delete(path: string, action: Function) {
    this.registerRoute("delete", path, action);
  }
  public patch(path: string, action: Function) {
    this.registerRoute("patch", path, action);
  }
  public options(path: string, action: Function) {
    this.registerRoute("options", path, action);
  }
  public head(path: string, action: Function) {
    this.registerRoute("head", path, action);
  }

  private makeRoute(f: Function) {
    return async (req: Request, res: Response) => {
      const reqMap = (name: string) => {
        if (name === "session" || name == "param" || name == "query" || name == "body") {
          return req[name];
        }
        const ret = req.params[name] || req.query[name] || req.body[name];
        if (ret === undefined || ret === null) {
          // TODO: Can we know if this param was required?
          return undefined;
        }
        return ret;
      };

      const argNames = getParamNames(f);
      const args = argNames.map(reqMap);

      let result;
      try {
        result = f.call(null, ...args);
        if (result instanceof Promise) {
          result = await result;
        }
        // eslint-disable-next-line
      } catch (e: any) {
        const error = e as Error & { HTTP_CODE?: number };
        res.status(error.HTTP_CODE ?? 500).json({ msg: error.message ?? "Internal Server Error" });
        return;
      }
      res.json(result);
    };
  }

  static all(route: string) {
    return this.httpDecorator("get", route);
  }
  static get(route: string) {
    return this.httpDecorator("get", route);
  }
  static post(route: string) {
    return this.httpDecorator("post", route);
  }
  static put(route: string) {
    return this.httpDecorator("put", route);
  }
  static delete(route: string) {
    return this.httpDecorator("delete", route);
  }
  static patch(route: string) {
    return this.httpDecorator("patch", route);
  }
  static options(route: string) {
    return this.httpDecorator("options", route);
  }
  static head(route: string) {
    return this.httpDecorator("head", route);
  }

  private static httpDecorator(method: HttpMethod, route: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (target: any, propertyKey: string) {
      Reflect.defineMetadata("method", method, target, propertyKey);
      Reflect.defineMetadata("path", route, target, propertyKey);
    };
  }
}

export function getExpressRouter(routes: Object) {
  const router = new Router();

  // Get all methods in the Routes class (e.g., getUsers, createUser, etc).
  const endpoints = Object.getOwnPropertyNames(Object.getPrototypeOf(routes));

  // Register the methods as routes in `router`.
  for (const endpoint of endpoints) {
    // Get the method and path metadata from the routes object.
    // These come from decorators in the Routes class.
    const method = Reflect.getMetadata("method", routes, endpoint) as HttpMethod;
    const path = Reflect.getMetadata("path", routes, endpoint) as string;

    // Skip if the method or path is not defined (e.g., when endpoint is the constructor)
    if (!method || !path) {
      continue;
    }

    // The ugly cast is because TypeScript doesn't know that `routes[endpoint]` is a correct method.
    const action = (routes as Record<string, Function>)[endpoint];

    router.registerRoute(method, path, action);
  }

  return router.expressRouter;
}