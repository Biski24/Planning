// Temporary development mode: disable login/password flow to focus on planning features.
// Keep it OFF in production builds/deployments.
export const AUTH_DISABLED =
  process.env.NODE_ENV !== "production" && process.env.AUTH_DISABLED === "true";
