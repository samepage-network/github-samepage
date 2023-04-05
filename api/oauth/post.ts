import createAPIGatewayHandler from "samepage/backend/createAPIGatewayProxyHandler";
import { zOauthRequest, zOauthResponse } from "samepage/internal/types";
import { z } from "zod";
import axios from "axios";
import { Octokit } from "@octokit/rest";
import jsonwebtoken from "jsonwebtoken";

const logic = async (
  args: z.infer<typeof zOauthRequest>
): Promise<z.infer<typeof zOauthResponse>> => {
  const { data } = await axios
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
    .catch((e) =>
      Promise.reject(
        new Error(`Failed to get access token: ${e.response.data}`)
      )
    );
  const { access_token } = data;
  const privateKey = process.env.APP_PRIVATE_KEY;
  const workspace = privateKey
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
          installation_id: Number(args.customParams?.installation_id) || 0,
        })
        .then((r) => r.data.account?.login ?? "")
    : "";
  return {
    suggestExtension: false,
    accessToken: access_token,
    workspace,
  };
};

export default createAPIGatewayHandler(logic);
