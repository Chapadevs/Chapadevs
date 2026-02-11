import { VertexAI } from '@google-cloud/vertexai';

/**
 * Vertex AI initialization logic
 */
export async function initializeVertexAI() {
  try {
    if (!process.env.GCP_PROJECT_ID) {
      console.warn('⚠️ GCP_PROJECT_ID not set. Vertex AI features disabled.');
      return { vertex: null, model: null, initialized: false };
    }
    
    const modelId = process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash';
    console.log(`🔧 Initializing Vertex AI for project: ${process.env.GCP_PROJECT_ID}`);
    console.log(`   Location: us-central1`);
    console.log(`   Model: ${modelId}`);
    
    // Check for local development credentials
    const serviceAccountPath = process.env.GMAIL_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountPath && process.env.NODE_ENV === 'development') {
      console.log(`   Using service account: ${serviceAccountPath}`);
      // Set GOOGLE_APPLICATION_CREDENTIALS if not already set
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && serviceAccountPath) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
      }
    }
    
    // In Cloud Run, authentication happens automatically via the service account
    // For local dev, GOOGLE_APPLICATION_CREDENTIALS should point to service account JSON
    const vertex = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: 'us-central1'
    });

    console.log('   ✅ VertexAI instance created');

    // Use Gemini 2.0 Flash (gemini-1.5-flash discontinued; 2.0 is current default)
    const model = vertex.getGenerativeModel({
      model: modelId,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.8,
        topP: 0.95,
      },
    });
    
    console.log('   ✅ Model instance created');
    
    // Mark ready immediately. No blocking test — cold start would timeout and force mock forever.
    // Real API calls are attempted per-request; generateProjectAnalysis/generateWebsitePreview
    // already catch errors and fall back to mock.
    console.log(`✅✅✅ Vertex AI initialized successfully with ${modelId} ✅✅✅`);
    console.log('   Model ready for code generation');
    
    return { vertex, model, initialized: true };
  } catch (error) {
    console.error('\n❌❌❌ VERTEX AI INITIALIZATION FAILED ❌❌❌');
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error name:', error.name);
    if (error.details) {
      console.error('   Error details:', JSON.stringify(error.details, null, 2));
    }
    console.error('   Full error:', error);
    
    if (error.message?.includes('authentication') || 
        error.message?.includes('permission') || 
        error.message?.includes('Permission denied') ||
        error.message?.includes('Unable to authenticate') ||
        error.code === 403) {
      console.error('\n   🔑 AUTHENTICATION/PERMISSION ERROR DETECTED');
      console.error('   Solutions for LOCAL DEVELOPMENT:');
      console.error('   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable:');
      console.error('      export GOOGLE_APPLICATION_CREDENTIALS="./chapadevs-468722-e8777b042699.json"');
      console.error('      (or use the same file as GMAIL_SERVICE_ACCOUNT_PATH)');
      console.error('   2. Or authenticate with gcloud:');
      console.error('      gcloud auth application-default login');
      console.error('   3. Ensure the service account has "Vertex AI User" role:');
      console.error('      gcloud projects add-iam-policy-binding chapadevs-468722 \\');
      console.error('           --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \\');
      console.error('           --role="roles/aiplatform.user"');
      console.error('   Solutions for CLOUD RUN:');
      console.error('   1. Ensure service account has "Vertex AI User" role');
      console.error('   2. Check service account in Cloud Run service settings');
      console.error('   3. Verify GCP_PROJECT_ID is correct:', process.env.GCP_PROJECT_ID);
    }
    
    if (error.message?.includes('not found') || 
        error.message?.includes('404') || 
        error.message?.includes('was not found') ||
        error.code === 404) {
      console.error('\n   🔍 API NOT ENABLED OR MODEL NOT FOUND');
      console.error('   Solutions:');
      console.error('   1. Enable Vertex AI API:');
      console.error('      gcloud services enable aiplatform.googleapis.com --project=chapadevs-468722');
      console.error('   2. Enable Generative AI API:');
      console.error('      gcloud services enable generativelanguage.googleapis.com --project=chapadevs-468722');
      console.error('   3. Check available models in your region:');
      console.error('      Visit: https://console.cloud.google.com/vertex-ai/model-garden?project=chapadevs-468722');
      console.error('   4. Try these model IDs:');
      console.error('      - gemini-2.0-flash-exp (experimental, usually available)');
      console.error('      - gemini-1.5-pro-002 (stable version)');
      console.error('      - gemini-1.5-flash-002 (faster alternative)');
      console.error('   5. Note: Some models may not be available in all regions');
    }
    
    if (error.message?.includes('quota') || 
        error.message?.includes('limit') || 
        error.code === 429) {
      console.error('\n   📊 QUOTA/LIMIT ERROR');
      console.error('   Solution: Check Vertex AI quotas in GCP Console');
    }
    
    console.error('\n   ⚠️ AI features will be disabled. Server will still start.');
    console.error('   ⚠️ Using mock data for AI previews until authentication is fixed.');
    console.error('   ⚠️ NO BILLING CHARGES - NO API CALLS WILL BE MADE\n');
    
    return { vertex: null, model: null, initialized: false };
  }
}
