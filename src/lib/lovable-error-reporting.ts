export const reportError = (error: any, context?: any) => {
  console.error("[Local Server Log] Captured Exception:", error, context);
};

export const initializeTelemetry = () => {
  print("[Direct DB Protocol] Lovable tracking telemetry disabled.");
};
