import createAPIGatewayHandler from "samepage/backend/createAPIGatewayProxyHandler";
import { zOauthResponse } from "samepage/internal/types";
import { z } from "zod";
import axios from "axios";
import { Octokit } from "@octokit/rest";

const logic = async (args: {
  code: string;
}): Promise<z.infer<typeof zOauthResponse>> => {
  const { data } = await axios.post<{ access_token: string }>(
    `https://api.notion.com/v1/oauth/token`,
    {
      code: args.code,
      redirect_uri:
        process.env.NODE_ENV === "production"
          ? "https://samepage.network/oauth/github"
          : "https://samepage.ngrok.io/oauth/github",
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_SECRET,
    }
  );
  const { access_token } = data;
  const octokit = new Octokit({ auth: access_token });
  const userData = await octokit.users.getAuthenticated();
  return {
    suggestExtension: false,
    accessToken: access_token,
    workspace: userData.data.name || "unknown",
  };
};

export default createAPIGatewayHandler(logic);
