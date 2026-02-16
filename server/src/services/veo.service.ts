type CreateVideoInput = {
  script: string;
};

export const veoService = {
  async createVideo(input: CreateVideoInput): Promise<string> {
    const hash = Buffer.from(input.script).toString("base64").slice(0, 12);
    return `https://cdn.local/videos/${Date.now()}_${hash}.mp4`;
  },
};
