import { GoogleGenAI } from "@google/genai";

/**
 * Vertex AI initialization using @google/genai SDK.
 * In Cloud Run, ADC is automatic via the attached service account.
 * Locally, set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON with roles/aiplatform.user.
 */
export async function initializeVertexAI() {
  try {
    if (!process.env.GCP_PROJECT_ID) {
      console.warn("⚠️ GCP_PROJECT_ID not set. Vertex AI features disabled.");
      return { ai: null, initialized: false };
    }

    const modelId = process.env.VERTEX_AI_MODEL || "gemini-2.5-pro";
    console.log(`🔧 Initializing Vertex AI for project: ${process.env.GCP_PROJECT_ID}`);
    console.log(`   Location: us-central1`);
    console.log(`   Model: ${modelId}`);

    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GCP_PROJECT_ID,
      location: "us-central1",
    });

    console.log(`✅✅✅ Vertex AI initialized successfully with ${modelId} ✅✅✅`);
    return { ai, initialized: true };
  } catch (error) {
    console.error("\n❌❌❌ VERTEX AI INITIALIZATION FAILED ❌❌❌");
    console.error("   Error message:", error.message);
    console.error("\n   ⚠️ AI features will be disabled. Server will still start.");
    console.error("   ⚠️ Using mock data for AI previews until authentication is fixed.\n");
    return { ai: null, initialized: false };
  }
}
