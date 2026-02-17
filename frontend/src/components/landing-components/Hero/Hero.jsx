import React from 'react'
import { Button, SecondaryButton, Textarea } from '../../ui-components'
import { useState } from 'react'
import './Hero.css'

const Hero = () => {
  const [generateFormData, setGenerateFormData] = useState({
    prompt: '',
  })
  const handleChange = (field, value) => {
    setGenerateFormData({ ...generateFormData, [field]: value });
  };
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <h1 className="title title--hero">
            Your <span className="highlight">Digital Vision</span>,
            <span className="highlight">OUR CODE</span>
          </h1>

          <p className="text text--lead hero-subtitle-creato">
            We turn your <span className="highlight">business ideas</span> into
            <span className="highlight">powerful web applications</span> with
            <span className="highlight">speed</span> and the
            <span className="highlight">control</span> you need.
          </p>

          <Textarea
            id="preview-prompt"
            label="Project description"
            value={generateFormData.prompt}
            onChange={(e) => handleChange('prompt', e.target.value)}
            placeholder="Describe the preview you want AI to generate..."
            required
            className="min-h-[120px]"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[10px] text-ink-muted/60 font-medium uppercase tracking-wider hidden sm:inline-block">
                {generateFormData.prompt?.length || 0} characters
              </span>
              
              <div className="flex items-center gap-1.5">
                <SecondaryButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-ink-muted hover:text-ink font-normal lowercase" 
                  to="/login"
                >
                  cancel
                </SecondaryButton>
                <Button 
                  type="submit" 
                  size="sm"
                  className="h-8 px-4 text-xs font-medium rounded-lg shadow-sm"
                  to="/login"
                >
                  Generate
                </Button>
              </div>
            </div>
          </Textarea>
        </div>
      </div>
    </section>
  )
}

export default Hero



