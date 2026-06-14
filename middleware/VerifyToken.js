import jwt from "jsonwebtoken";

export const getJwtSecret = () => {
  return process.env.SECRET_KEY || process.env.JWT_SECRET || "secret";
};

export const getTokenFromRequest = (req) => {
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
  }
  if (req.query?.token) {
    return String(req.query.token);
  }
  return null;
};

export const verifyToken = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = getTokenFromRequest(req);
      if (!token) {
        return res.status(401).json({ message: "Authentication token missing" });
      }

      const jwtSecret = getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret);

      if (!decoded || !decoded.id || !decoded.role) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      };

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      return next();
    } catch (err) {
      console.error("VerifyToken error:", err?.message || err);
      if (err?.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};
