import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const applySecurityMiddleware = (app) => {
  app.use(helmet());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });

  app.use(limiter);
};
