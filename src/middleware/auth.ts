import { auth } from "express-oauth2-jwt-bearer";
import { RequestHandler } from "express";

import "dotenv/config"; // config from .env
import { jwtDecode } from "jwt-decode";
import { ROLES } from "../helper/constants.ts";

declare module "jwt-decode" {
  export interface JwtPayload {
    "ku-event-hub-roles": string[];
  }
}

/**
 * Authorization middleware. When used, the Access Token must
 * exist and be verified against the Auth0 JSON Web Key Set.
 */
export const checkJwt = auth({
  audience: process.env.AUTH0_IDENTIFIER,
  issuerBaseURL: process.env.AUTH0_DOMAIN,
  tokenSigningAlg: "RS256",
});

/**
 * Middleware: checks if the user has the 'user' role.
 */
export const checkUserRole: RequestHandler = (req, res, next) => {
  // check user token
  const token = req.get("Authorization");

  // if user doesn't have access token
  // return 401 Unauthorized
  if (!token) {
    res.status(401).send("Unauthorized");
    return;
  }

  // decode token and get user's role
  const decodedToken = jwtDecode(token);
  const role = decodedToken["ku-event-hub-roles"][0]; // you can only have one role for now

  // if user doesn't have the user role
  // return 403 Forbidden
  if (role !== ROLES.USER) {
    res.status(403).send("Forbidden");
    return;
  }

  // continue
  next();
};

/**
 * Middleware: checks if the user has the 'admin' role.
 */
export const checkAdminRole: RequestHandler = (req, res, next) => {
  // check user token
  const token = req.get("Authorization");

  // if user doesn't have access token
  // return 401 Unauthorized
  if (!token) {
    res.status(401).send("Unauthorized");
    return;
  }

  // decode token and get user's role
  const decodedToken = jwtDecode(token);
  const role = decodedToken["ku-event-hub-roles"][0]; // you can only have one role for now

  // if user doesn't have the admin role
  // return 403 Forbidden
  if (role !== ROLES.ADMIN) {
    res.status(403).send("Forbidden");
    return;
  }

  // continue
  next();
};
