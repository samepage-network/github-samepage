import createAPIGatewayHandler from "samepage/backend/createAPIGatewayProxyHandler";

const logic = (args: { action: "created" | "deleted"; sender: unknown }) => {
  // TODO - verify the webhook is from GitHub and delete related notebook
  console.log("WEBHOOK", args.action, args.sender, Object.keys(args));
  return {};
};

export default createAPIGatewayHandler(logic);
