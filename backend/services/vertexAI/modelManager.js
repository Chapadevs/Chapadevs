/**
 * Simple model management for Vertex AI
 * Only supports: gemini-2.5-pro
 */

export async function getModel(vertex, modelInstances, modelId = 'gemini-2.5-pro') {
  if (!vertex) {
    return null;
  }

  if (modelId !== 'gemini-2.5-pro') {
    console.warn(`⚠️ Unsupported model: ${modelId}. Using gemini-2.5-pro instead.`);
    modelId = 'gemini-2.5-pro';
  }

  // Return cached model instance if available
  if (modelInstances.has(modelId)) {
    return modelInstances.get(modelId);
  }

  const maxOutputTokens = 16384;
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
