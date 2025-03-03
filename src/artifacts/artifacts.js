// api/src/artifacts/image.js
import { createDocumentHandler } from "./artifacts.js";

export const imageDocumentHandler = createDocumentHandler({
  kind: "image",
  onCreateDocument: async ({ title, dataStream, session }) => {
    const workersai = session.env.AI;

    // Using Cloudflare's Stable Diffusion model
    const result = await workersai.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
      prompt: title,
    });

    const base64Image = result.data[0];

    dataStream.writeData({
      type: "image-delta",
      content: base64Image,
    });

    return base64Image;
  },
  onUpdateDocument: async ({ description, dataStream, session }) => {
    const workersai = session.env.AI;

    const result = await workersai.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
      prompt: description,
    });

    const base64Image = result.data[0];

    dataStream.writeData({
      type: "image-delta",
      content: base64Image,
    });

    return base64Image;
  },
});
