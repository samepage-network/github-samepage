import { Octokit } from "@octokit/rest";
import apiClient from "samepage/internal/apiClient";

const message = async (args: {
  operation: "REQUEST";
  credentials: { accessToken: string; notebookUuid: string; token: string };
  request: { conditions: {}[] };
  source: { uuid: string };
}) => {
  if (args.operation === "REQUEST") {
    const octokit = new Octokit({ auth: args.credentials.accessToken });
    const result = await octokit.issues
      .listForRepo({ owner: "samepage-network", repo: "samepage.network" })
      .then((r) => r.data.map((iss) => ({ id: iss.id, text: iss.title })));
    await apiClient({
      method: "notebook-response",
      request: args.request,
      target: args.source.uuid,
      response: { result },
      notebookUuid: args.credentials.notebookUuid,
      token: args.credentials.token,
    })
      .then(() => console.log("responded to notebook request"))
      .catch((e) => console.error(e, "bad response"));
  }
  return { success: true };
};

export default message;
