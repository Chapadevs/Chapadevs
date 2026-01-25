#!/usr/bin/env node

/**
 * Diagnostic script to check Vertex AI setup
 * Run: node backend/scripts/check-vertex-ai.js
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

console.log('🔍 Vertex AI Diagnostic Check\n')
console.log('=' .repeat(50))

// Check environment variables
console.log('\n1. Environment Variables:')
console.log('   GCP_PROJECT_ID:', process.env.GCP_PROJECT_ID || '❌ NOT SET')
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development')

// Check if Vertex AI package is installed
console.log('\n2. Dependencies:')
try {
  const vertexAI = await import('@google-cloud/vertexai')
  console.log('   ✅ @google-cloud/vertexai is installed')
} catch (error) {
  console.log('   ❌ @google-cloud/vertexai is NOT installed')
  console.log('   Run: npm install @google-cloud/vertexai')
  process.exit(1)
}

// Try to initialize Vertex AI
console.log('\n3. Vertex AI Initialization Test:')
try {
  const { VertexAI } = await import('@google-cloud/vertexai')
  
  if (!process.env.GCP_PROJECT_ID) {
    console.log('   ❌ GCP_PROJECT_ID not set in .env file')
    process.exit(1)
  }
  
  console.log(`   Attempting to initialize Vertex AI for project: ${process.env.GCP_PROJECT_ID}`)
  
  const vertex = new VertexAI({
    project: process.env.GCP_PROJECT_ID,
    location: 'us-central1'
  })
  
  console.log('   ✅ VertexAI instance created')
  
  // Try to get a model
  const model = vertex.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 100,
      temperature: 0.7,
    },
  })
  
  console.log('   ✅ Model instance created (gemini-1.5-flash)')
  
  // Try a test API call
  console.log('\n4. Test API Call:')
  console.log('   Sending test request to Vertex AI...')
  
  const testPrompt = 'Say "Hello" in one word'
  const response = await model.generateContent(testPrompt)
  const text = response.response.text()
  
  console.log('   ✅ API call successful!')
  console.log('   Response:', text)
  console.log('\n✅✅✅ VERTEX AI IS WORKING! ✅✅✅\n')
  
} catch (error) {
  console.log('   ❌ Initialization failed!')
  console.log('\n   Error Details:')
  console.log('   Message:', error.message)
  console.log('   Code:', error.code)
  console.log('   Details:', error.details || 'N/A')
  
  if (error.message?.includes('authentication') || error.message?.includes('permission')) {
    console.log('\n   🔑 AUTHENTICATION ERROR DETECTED')
    console.log('   Solutions:')
    console.log('   1. Run: gcloud auth application-default login')
    console.log('   2. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable')
    console.log('   3. In Cloud Run: Ensure service account has "Vertex AI User" role')
  }
  
  if (error.message?.includes('not found') || error.code === 404) {
    console.log('\n   🔍 API NOT ENABLED')
    console.log('   Solution: Enable Vertex AI API')
    console.log('   Run: gcloud services enable aiplatform.googleapis.com')
  }
  
  if (error.message?.includes('quota') || error.message?.includes('limit')) {
    console.log('\n   📊 QUOTA ERROR')
    console.log('   Solution: Check Vertex AI quotas in GCP Console')
  }
  
  console.log('\n❌❌❌ VERTEX AI IS NOT WORKING ❌❌❌\n')
  process.exit(1)
}
