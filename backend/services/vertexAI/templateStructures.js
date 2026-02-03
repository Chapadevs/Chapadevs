/**
 * Template structure definitions for different project types
 */

/**
 * Get template structure based on niche/project type
 */
export function getTemplateStructure(niche) {
  const lowerNiche = (niche || '').toLowerCase();
  
  // E-commerce template
  if (lowerNiche.includes('ecommerce') || lowerNiche.includes('store') || lowerNiche.includes('shop') || lowerNiche.includes('selling')) {
    return {
      type: 'ecommerce',
      sections: [
        { type: 'hero', required: true, description: 'Hero section with main CTA' },
        { type: 'products', required: true, count: '6-12', description: 'Product showcase grid' },
        { type: 'features', required: true, count: '4-6', description: 'Key features/benefits' },
        { type: 'testimonials', required: false, count: '3-5', description: 'Customer testimonials' },
        { type: 'footer', required: true, description: 'Footer with links and contact' }
      ]
    };
  }
  
  // Advocacy template
  if (lowerNiche.includes('advocacy') || lowerNiche.includes('nonprofit') || lowerNiche.includes('charity') || lowerNiche.includes('cause')) {
    return {
      type: 'advocacy',
      sections: [
        { type: 'hero', required: true, description: 'Hero with mission statement' },
        { type: 'mission', required: true, description: 'Mission and values section' },
        { type: 'services', required: true, count: '4-6', description: 'Services or programs offered' },
        { type: 'impact', required: false, description: 'Impact metrics and stories' },
        { type: 'footer', required: true, description: 'Footer with contact and social links' }
      ]
    };
  }
  
  // Portfolio template
  if (lowerNiche.includes('portfolio') || lowerNiche.includes('personal') || lowerNiche.includes('freelance')) {
    return {
      type: 'portfolio',
      sections: [
        { type: 'hero', required: true, description: 'Hero with name and tagline' },
        { type: 'projects', required: true, count: '6-9', description: 'Project showcase gallery' },
        { type: 'skills', required: true, description: 'Skills and expertise section' },
        { type: 'contact', required: true, description: 'Contact form or information' },
        { type: 'footer', required: true, description: 'Footer with social links' }
      ]
    };
  }
  
  // Blog template
  if (lowerNiche.includes('blog') || lowerNiche.includes('news') || lowerNiche.includes('article')) {
    return {
      type: 'blog',
      sections: [
        { type: 'hero', required: true, description: 'Hero with featured post' },
        { type: 'featured', required: true, count: '3-6', description: 'Featured posts grid' },
        { type: 'categories', required: false, description: 'Category navigation' },
        { type: 'newsletter', required: false, description: 'Newsletter signup' },
        { type: 'footer', required: true, description: 'Footer with links' }
      ]
    };
  }
  
  // Default business template
  return {
    type: 'business',
    sections: [
      { type: 'hero', required: true, description: 'Hero section with main value proposition' },
      { type: 'services', required: true, count: '4-6', description: 'Services offered' },
      { type: 'about', required: true, description: 'About the business' },
      { type: 'testimonials', required: false, count: '3-5', description: 'Client testimonials' },
      { type: 'footer', required: true, description: 'Footer with contact and links' }
    ]
  };
}
