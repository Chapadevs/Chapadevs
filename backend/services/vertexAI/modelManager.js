/**
 * Simple model management for Vertex AI
 * Only supports: gemini-2.0-flash and gemini-2.5-pro
 */

export async function getModel(vertex, modelInstances, modelId = 'gemini-2.0-flash') {
  if (!vertex) {
    return null;
  }

  // Only allow these two models
  if (modelId !== 'gemini-2.0-flash' && modelId !== 'gemini-2.5-pro') {
    console.warn(`⚠️ Unsupported model: ${modelId}. Using gemini-2.0-flash instead.`);
    modelId = 'gemini-2.0-flash';
  }

  // Return cached model instance if available
  if (modelInstances.has(modelId)) {
    return modelInstances.get(modelId);
  }

  // Create model instance (2.5-pro gets higher limit to avoid truncating long code)
  const maxOutputTokens = modelId === "gemini-2.5-pro" ? 16384 : 8192;
  try {
    const model = vertex.getGenerativeModel({
      model: modelId,
      generationConfig: {
        maxOutputTokens,
        temperature: 0.8,
        topP: 0.95,
      },
    });
    
    // Cache the instance
    modelInstances.set(modelId, model);
    console.log(`✅ Model instance created: ${modelId}`);
    return model;
  } catch (error) {
    console.error(`❌ Failed to create model ${modelId}:`, error.message);
    return null;
  }
}
