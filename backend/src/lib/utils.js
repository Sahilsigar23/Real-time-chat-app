import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true if deployed on https
    sameSite: "lax", // "lax" works better for localhost development
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};
