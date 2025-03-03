import { createDocumentHandler } from "./handler";

export const textDocumentHandler = createDocumentHandler({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = "";
    const workersai = session.env.AI;

    const result = await workersai.run("@cf/meta/llama-2-7b-chat-int8", {
      messages: [
        {
          role: "system",
          content: "Write about the given topic. Markdown is supported. Use headings where appropriate.",
        },
        { role: "user", content: title }
      ],
      stream: true
    });

    for await (const chunk of result) {
      draftContent += chunk;
      dataStream.writeData({
        type: "text-delta",
        content: chunk
      });
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    let draftContent = "";
    const workersai = session.env.AI;

    const result = await workersai.run("@cf/meta/llama-2-7b-chat-int8", {
      messages: [
        {
          role: "system",
          content: `Update the following text based on the description. Original text: ${document.content}`
        },
        { role: "user", content: description }
      ],
      stream: true
    });

    for await (const chunk of result) {
      draftContent += chunk;
      dataStream.writeData({
        type: "text-delta",
        content: chunk
      });
    }

    return draftContent;
  }
});
