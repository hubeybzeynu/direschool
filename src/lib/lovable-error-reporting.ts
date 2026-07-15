export const reportError = (error: any, context?: any) => {
  console.error("[Local Log] Exception:", error, context);
};

export const initializeTelemetry = () => {
  console.log("[Direct Protocol] Telemetry bypassed.");
};
