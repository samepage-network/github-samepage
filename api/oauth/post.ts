import createAPIGatewayHandler from "samepage/backend/createAPIGatewayProxyHandler";
import { zOauthRequest, zOauthResponse } from "samepage/internal/types";
import ServerError from "samepage/backend/ServerError";
import parseZodError from "samepage/utils/parseZodError";
import { z } from "zod";
import axios from "axios";
import { Octokit } from "@octokit/rest";
import jsonwebtoken from "jsonwebtoken";

const zCustomParams = z.object({
  installation_id: z.string().optional(),
});

const maskString = (s = "") =>
  `${s
    .split("")
    .slice(0, -4)
    .map(() => "*")
    .join("")}${s.slice(-4)}`;

const logic = async (
  args: z.infer<typeof zOauthRequest>
): Promise<z.infer<typeof zOauthResponse>> => {
  const customParams = zCustomParams.safeParse(args.customParams);
  if (!customParams.success) {
    throw new ServerError(
      `Failed to parse custom params: ${parseZodError(customParams.error)}`,
      400
    );
  }

  const response = await axios
    .post<{ access_token: string }>(
      `https://github.com/login/oauth/access_token`,
      {
        code: args.code,
        redirect_uri:
          process.env.NODE_ENV === "production"
            ? "https://samepage.network/oauth/github"
            : "https://samepage.ngrok.io/oauth/github",
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    )
    .catch((e) => {
      console.error("Failed to fetch access token");
      console.error(e);
      console.error("Arguments:");
      const maskedArgs = {
        ...args,
        code: maskString(args.code),
      };
      console.error(maskedArgs);
      throw new ServerError(
        `Failed to get access token: ${e.response.data}`,
        401
      );
    });
  const { access_token } = response.data;
  const privateKey = process.env.APP_PRIVATE_KEY;
  const installationId = customParams.data?.installation_id;
  const workspace =
    privateKey && installationId
      ? await new Octokit({
          auth: jsonwebtoken.sign(
            {
              iss: 312167,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 60 * 10,
            },
            privateKey,
            {
              algorithm: "RS256",
            }
          ),
        }).apps
          .getInstallation({
            installation_id: Number(installationId),
          })
          .then((r) => r.data.account?.login ?? "")
          .catch((e) => {
            console.error("Failed to get installation details");
            console.error(e);
            console.error("Arguments:");
            const maskedArgs = {
              access_token: maskString(access_token),
              privateKey: maskString(privateKey),
              installation_id: maskString(installationId),
            };
            console.error(maskedArgs);
            throw new ServerError(
              `Failed to get installation details: ${e.message}`,
              401
            );
          })
      : "";
  return {
    suggestExtension: false,
    accessToken: access_token,
    workspace,
  };
};

export default createAPIGatewayHandler({
  logic,
  allowedOrigins: [/.*/],
});
