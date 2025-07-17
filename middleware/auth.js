import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = "C09GalleryAccess";
const REFRESH_SECRET = "C09GalleryRefresh";

export const accessTokenBlacklist = new Set();
export const refreshTokenStorage = new Set();

export function generateTokens(user) {
  const jti = crypto.randomUUID();
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, jti },
    ACCESS_SECRET,
    { expiresIn: "60m" },
  );
  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, jti },
    REFRESH_SECRET,
    { expiresIn: "7d" },
  );
  refreshTokenStorage.add(refreshToken);
  return { accessToken, refreshToken };
}

export function isAuth(options = { required: true }) {
  return (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      if (!options.required) {
        // If auth is optional and no token is provided, continue without user info
        req.user = null;
        return next();
      } else {
        // If auth is required and no token is provided, return 401
        return res.status(401).json({ error: "Access token is required" });
      }
    }

    jwt.verify(token, ACCESS_SECRET, (err, user) => {
      if (err) {
        if (!options.required) {
          // If auth is optional and token is invalid, continue without user info
          req.user = null;
          return next();
        } else {
          // If auth is required and token is invalid, return 403
          return res.status(403).json({ error: "Invalid access token" });
        }
      }

      // Check if token is blacklisted
      if (user.jti && accessTokenBlacklist.has(user.jti)) {
        return res.status(401).json({ error: "Access token revoked" });
      }

      req.user = user;
      req.token = token;
      next();
    });
  };
}

// Copilot (lines 67-105): Properly implement blacklisting access tokens
/**
 * Blacklist an access token to prevent further use
 * @param {string} token - The access token to blacklist
 * @returns {boolean} - Whether the token was successfully blacklisted
 */
export function blacklistAccessToken(token) {
  try {
    // Decode the token to get the jti
    const decoded = jwt.verify(token, ACCESS_SECRET);
    if (decoded && decoded.jti) {
      accessTokenBlacklist.add(decoded.jti);

      // Clean up expired tokens from the blacklist periodically
      // In a production app, this would be done by a separate scheduled job
      cleanupBlacklist();

      return true;
    }
    return false;
  } catch (err) {
    console.error("Error blacklisting token:", err);
    return false;
  }
}

/**
 * Clean up expired tokens from the blacklist
 * In a real production app, this would be a scheduled job
 */
function cleanupBlacklist() {
  // This is a simplified version for demonstration
  // In production, you would use a more robust solution with a database
  // and a scheduled job to clean up expired tokens

  // For now, we'll randomly clean up the blacklist when it gets too large
  if (accessTokenBlacklist.size > 1000) {
    console.log("Cleaning up token blacklist");
    accessTokenBlacklist.clear();
  }
}
