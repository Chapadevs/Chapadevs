import asyncHandler from "express-async-handler";
import { isAllowedGcsUrl, getGcsStream } from "../utils/gcsProxyUtils.js";

/**
 * GET /api/images/proxy?url=...
 * Proxies GCS image/file from our allowed buckets. No signed URLs needed.
 * Used for preview thumbnails, project attachments, etc.
 */
export const proxyImageHandler = asyncHandler(async (req, res) => {
  const url = (req.query.url || "").trim();
  if (!url || !isAllowedGcsUrl(url)) {
    res.status(400).json({ error: "Invalid or missing GCS URL" });
    return;
  }

  const result = await getGcsStream(url);
  if (!result) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.set("Content-Type", result.contentType);
  res.set("Cache-Control", "public, max-age=3600");
  result.stream.pipe(res);
});
