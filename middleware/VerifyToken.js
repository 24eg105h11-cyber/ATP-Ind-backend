import jwt from "jsonwebtoken";
import { config } from "dotenv";
const { verify } = jwt;
config();

export const verifyToken = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      //get token from cookie
      const token = req.cookies?.token; // { token : asdasd}
      //check token existed or not
      if (!token) {
        return res.status(401).json({ message: "Please login first" });
      }
      //validate token(decode the token)
      const jwtSecret = process.env.SECRET_KEY || process.env.JWT_SECRET || "secret";
      let decodedToken = verify(token, jwtSecret);

      // check the role is same as role in decodedToken
      if (!allowedRoles.includes(decodedToken.role)) {
        return res.status(403).json({ message: "You are not authorized" });
      }
      //add decoded token
      req.user = decodedToken;
      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
};
