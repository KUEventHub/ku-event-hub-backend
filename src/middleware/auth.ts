import { auth } from "express-oauth2-jwt-bearer";
import { RequestHandler } from "express";

import "dotenv/config"; // config from .env
import { jwtDecode } from "jwt-decode";
import { ROLES } from "../helper/constants.ts";
import { findUserWithAuth0Id, getAuth0Id } from "../services/users.ts";
import BanLog from "../schema/BanLog.ts";

declare module "jwt-decode" {
  export interface JwtPayload {
    "ku-event-hub-roles": string[];
  }
}

/**
 * Authorization middleware. When used, the Access Token must
 * exist and be verified against the Auth0 JSON Web Key Set.
 */
export const checkAccessToken = auth({
  audience: process.env.AUTH0_IDENTIFIER,
  issuerBaseURL: process.env.AUTH0_DOMAIN,
  tokenSigningAlg: "RS256",
});

/**
 * Middleware: checks if the user has the 'admin' role.
 */
export const checkAdminRole: RequestHandler = async (req, res, next) => {
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

/**
 * Middleware: checks if the user has the 'user' role.
 */
export const checkUserRole: RequestHandler = async (req, res, next) => {
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
 * Middleware: checks if the user is the same user in the url.
 */
export const checkSameUser: RequestHandler = async (req, res, next) => {
  // get id from url params
  const id = req.params.id;

  // check user token
  const token = req.get("Authorization");
  const auth0id = getAuth0Id(token!);
  const auth0user = await findUserWithAuth0Id(auth0id);

  // if there's no user with auth0 id, respond with error
  if (!auth0user) {
    res.status(404).send({
      error: "User not found",
    });
    return;
  }

  // if user is not the same as the user in the url, respond with error
  if (auth0user._id.toString() !== id) {
    res.status(401).send({
      error: "Unauthorized",
    });
    return;
  }

  // continue
  next();
};

/**
 * Middleware: checks if the user is banned.
 * On the off chance that user managed to evade the ban check frontend.
 */
export const checkUserBan: RequestHandler = async (req, res, next) => {
  // check user token
  const token = req.get("Authorization");
  const auth0id = getAuth0Id(token!);
  const auth0user = await findUserWithAuth0Id(auth0id);

  // if there's no user with auth0 id, respond with error
  if (!auth0user) {
    res.status(404).send({
      error: "User not found",
    });
    return;
  }

  // get user ban
  const ban = await BanLog.findById(auth0user.ban);

  // if there is no ban
  if (!ban) {
    // continue
    next();
    return;
  }

  // if ban is active
  if (ban.isActive) {
    // check if ban is expired
    const now = new Date();

    if (ban.expiresAt < now) {
      await ban.updateOne({
        isActive: false,
        updatedAt: Date.now(),
      });
    } else {
      // if not expired, respond with error
      res.status(403).send({
        error: "You are banned",
        ban: {
          _id: ban._id,
          reason: ban.reason,
          expiresAt: ban.expiresAt,
        },
      });
      return;
    }
  }

  // continue
  next();
};
