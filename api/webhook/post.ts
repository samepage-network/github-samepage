import createAPIGatewayHandler from "samepage/backend/createAPIGatewayProxyHandler";

const logic = (args: { action: "created" | "deleted" }) => {
  // TODO - verify the webhook is from GitHub and delete related notebook
  console.log("WEBHOOK", Object.keys(args));
  return {};
};

export default createAPIGatewayHandler(logic);
