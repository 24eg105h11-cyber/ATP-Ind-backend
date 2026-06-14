import jwt from "jsonwebtoken";
import { config } from "dotenv";
const { verify } = jwt;
config();

const getJwtSecret = () => process.env.SECRET_KEY || process.env.JWT_SECRET || "secret";
const getTokenFromRequest = (req) => {
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
};

export const verifyToken = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const token = getTokenFromRequest(req);
      if (!token) {
        return res.status(401).json({ message: "Please login first" });
      }

      const jwtSecret = getJwtSecret();
      const decodedToken = verify(token, jwtSecret);

      if (!allowedRoles.includes(decodedToken.role)) {
        return res.status(403).json({ message: "You are not authorized" });
      }

      req.user = decodedToken;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};
