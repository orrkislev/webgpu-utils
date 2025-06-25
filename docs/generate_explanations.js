// Flexible content loader for multiple tutorials
class TutorialLoader {
    constructor(options = {}) {
        this.contentPath = options.contentPath || './content.json';
        this.prismTheme = options.prismTheme || 'prism-tomorrow';
        this.fallbackContent = options.fallbackContent || null;
    }

    // Generate HTML using template literals
    createCodeExample(example) {
        return `
            <div class="code-example">
                <div class="code-side">
                    <pre><code class="language-javascript">${this.escapeHtml(example.code)}</code></pre>
                </div>
                <div class="explanation-side">
                    ${example.explanation}
                </div>
            </div>
        `;
    }

    createIntro(content) {
        const featuresList = content.intro.features
            .map(feature => `<li><strong>${feature.label}:</strong> ${feature.description}</li>`)
            .join('');
        
        return `
            <div style="display: flex; align-items: center; gap: 10px;">
                <a href="../" class="logo-link">
                    <img src="../logo.png" alt="webgpu-utils logo" class="logo-image">
                </a>
                <h2>${content.meta.title}</h2>
            </div>
            <div class="intro">
                <p>${content.intro.description}</p>
                <ul>
                    ${featuresList}
                </ul>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Auto-detect content file based on current page
    autoDetectContentPath() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        
        // If we're in an examples subdirectory, look for content.json there first
        if (segments.includes('examples')) {
            const exampleName = segments[segments.length - 1] || segments[segments.length - 2];
            return `./content.json`; // Local to the example directory
        }
        
        // Otherwise, try to infer from URL or use default
        const pageName = segments[segments.length - 1]?.replace('.html', '') || 'index';
        return `../content/${pageName}.json`;
    }

    // Load content with multiple fallback strategies
    async loadContent() {
        const contentPaths = [
            this.contentPath,
            this.autoDetectContentPath(),
            './content.json',
            '../content.json'
        ];

        for (const path of contentPaths) {
            try {
                console.log(`Trying to load: ${path}`);
                const response = await fetch(path);
                if (response.ok) {
                    const content = await response.json();
                    console.log(`Successfully loaded: ${path}`);
                    return content;
                }
            } catch (error) {
                console.warn(`Failed to load ${path}:`, error.message);
            }
        }

        // Final fallback
        if (this.fallbackContent) {
            console.log('Using fallback content');
            return this.fallbackContent;
        }

        throw new Error('No content could be loaded');
    }

    // Render the tutorial
    async render() {
        try {
            const content = await this.loadContent();
            
            // Update page metadata
            if (content.meta) {
                document.title = content.meta.title;
                const h2 = document.querySelector('h2');
                if (h2) h2.textContent = content.meta.title;
            }
            
            // Generate intro section
            if (content.intro) {
                const existingIntro = document.querySelector('.intro');
                if (existingIntro) {
                    existingIntro.outerHTML = this.createIntro(content);
                }
            }
            
            // Generate code examples
            if (content.codeExamples) {
                const codeExamplesHtml = content.codeExamples
                    .map(example => this.createCodeExample(example))
                    .join('');
                
                let codeContainer = document.getElementById('code-examples');
                if (!codeContainer) {
                    codeContainer = document.createElement('div');
                    codeContainer.id = 'code-examples';
                    document.getElementById('leftSide').appendChild(codeContainer);
                }
                codeContainer.innerHTML = codeExamplesHtml;
            }
            
            // Load and apply Prism.js
            this.loadPrismJS();
            
        } catch (error) {
            console.error('Failed to render tutorial:', error);
            this.renderError(error);
        }
    }

    renderError(error) {
        const errorHtml = `
            <div class="intro" style="background: #ffe6e6; border-left: 4px solid #ff4444;">
                <p><strong>Error loading tutorial content:</strong> ${error.message}</p>
                <p>Please check that the content file exists and is valid JSON.</p>
            </div>
        `;
        
        const existingIntro = document.querySelector('.intro');
        if (existingIntro) {
            existingIntro.outerHTML = errorHtml;
        }
    }

    loadPrismJS() {
        // Don't load if already loaded
        if (window.Prism) {
            Prism.highlightAll();
            return;
        }

        // Load Prism CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/${this.prismTheme}.css`;
        document.head.appendChild(link);
        
        // Load Prism JS
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.js';
        script.onload = () => {
            Prism.highlightAll();
        };
        document.body.appendChild(script);
    }
}

// Global function for easy use
window.loadTutorial = function(options = {}) {
    const loader = new TutorialLoader(options);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => loader.render());
    } else {
        loader.render();
    }
};

// Auto-load if no explicit call
document.addEventListener('DOMContentLoaded', () => {
    // Only auto-load if loadTutorial hasn't been called explicitly
    if (!window.tutorialLoaded) {
        window.loadTutorial();
    }
});