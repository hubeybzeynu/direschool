export const handleGatewayQuery = async (query: string) => {
  console.warn("AI Gateway running in standalone local-bypass mode.");
  return { success: true, mode: "offline-direct" };
};
