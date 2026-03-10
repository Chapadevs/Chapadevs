import asyncHandler from "express-async-handler";
import {
  isGcsAvatar,
  getSignedAvatarUrl,
  getAvatarStream,
} from "../utils/avatarStorage.js";

/**
 * GET /api/avatars/signed-url?url=...
 * Returns a signed URL for a GCS avatar. Use when the bucket is private.
 * Public - avatars are profile pictures, no auth required to view.
 */
export const getSignedAvatarUrlHandler = asyncHandler(async (req, res) => {
  const url = (req.query.url || "").trim();
  if (!url || !isGcsAvatar(url)) {
    res.status(400).json({ error: "Invalid or missing avatar URL" });
    return;
  }

  const signedUrl = await getSignedAvatarUrl(url);
  res.json({ url: signedUrl });
});

/**
 * GET /api/avatars/image?url=...
 * Proxies avatar image from GCS. Use when the bucket is private and signed URLs are not suitable.
 * Public - avatars are profile pictures.
 */
export const getAvatarImageHandler = asyncHandler(async (req, res) => {
  const url = (req.query.url || "").trim();
  if (!url || !isGcsAvatar(url)) {
    res.status(400).json({ error: "Invalid or missing avatar URL" });
    return;
  }

  const result = await getAvatarStream(url);
  if (!result) {
    res.status(404).json({ error: "Avatar not found" });
    return;
  }

  res.set("Content-Type", result.contentType);
  res.set("Cache-Control", "public, max-age=3600");
  result.stream.pipe(res);
});
