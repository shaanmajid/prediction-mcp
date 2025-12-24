#!/usr/bin/env node

/**
 * Entry point for the Prediction Markets MCP Server.
 *
 * This file is the executable entry point. All server logic lives in src/server.ts.
 */

import { logger } from "./src/logger.js";
import { AuthInitError, startServer } from "./src/server.js";

startServer().catch((error) => {
  if (error instanceof AuthInitError) {
    logger.error({ ...error.details }, error.message);
  } else {
    logger.error({ err: error }, "Fatal error");
  }
  process.exit(1);
});
