// wgsl.js - WGSL template literal with builder pattern

import { height, width } from './canvas.js';
import { getNoiseCode } from './noise.js';

class WGSLParser {
  constructor(code) {
    this.code = code;
    this.position = 0;
    this.functions = [];
    this.body = [];
  }

  peek(offset = 0) {
    return this.code[this.position + offset] || '';
  }

  advance() {
    return this.code[this.position++] || '';
  }

  skipWhitespace() {
    while (this.position < this.code.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  skipComment() {
    if (this.peek() === '/' && this.peek(1) === '/') {
      // Skip single line comment
      while (this.position < this.code.length && this.peek() !== '\n') {
        this.advance();
      }
      return true;
    }
    if (this.peek() === '/' && this.peek(1) === '*') {
      // Skip block comment
      this.advance(); // skip '/'
      this.advance(); // skip '*'
      while (this.position < this.code.length - 1) {
        if (this.peek() === '*' && this.peek(1) === '/') {
          this.advance(); // skip '*'
          this.advance(); // skip '/'
          break;
        }
        this.advance();
      }
      return true;
    }
    return false;
  }

  skipWhitespaceAndComments() {
    let skipped = true;
    while (skipped) {
      const before = this.position;
      this.skipWhitespace();
      this.skipComment();
      skipped = this.position > before;
    }
  }

  readIdentifier() {
    let result = '';
    while (this.position < this.code.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  matchKeyword(keyword) {
    const start = this.position;
    this.skipWhitespaceAndComments();
    
    for (let i = 0; i < keyword.length; i++) {
      if (this.peek() !== keyword[i]) {
        this.position = start;
        return false;
      }
      this.advance();
    }
    
    // Make sure it's not part of a longer identifier
    if (/[a-zA-Z0-9_]/.test(this.peek())) {
      this.position = start;
      return false;
    }
    
    return true;
  }

  findMatchingBrace() {
    if (this.peek() !== '{') return -1;
    
    const start = this.position;
    this.advance(); // skip opening brace
    
    let braceCount = 1;
    while (this.position < this.code.length && braceCount > 0) {
      this.skipWhitespaceAndComments();
      
      if (this.peek() === '{') {
        braceCount++;
        this.advance();
      } else if (this.peek() === '}') {
        braceCount--;
        this.advance();
      } else if (this.peek() === '"') {
        // Skip string literals
        this.advance(); // skip opening quote
        while (this.position < this.code.length && this.peek() !== '"') {
          if (this.peek() === '\\') {
            this.advance(); // skip escape character
          }
          this.advance();
        }
        if (this.peek() === '"') this.advance(); // skip closing quote
      } else {
        this.advance();
      }
    }
    
    return braceCount === 0 ? this.position : -1;
  }

  parseFunction() {
    const start = this.position;
    
    // Skip 'fn'
    if (!this.matchKeyword('fn')) return null;
    
    this.skipWhitespaceAndComments();
    
    // Read function name
    const name = this.readIdentifier();
    if (!name) {
      this.position = start;
      return null;
    }
    
    this.skipWhitespaceAndComments();
    
    // Find parameters
    if (this.peek() !== '(') {
      this.position = start;
      return null;
    }
    
    // Skip to after parameters
    let parenCount = 1;
    this.advance(); // skip opening paren
    while (this.position < this.code.length && parenCount > 0) {
      if (this.peek() === '(') parenCount++;
      else if (this.peek() === ')') parenCount--;
      this.advance();
    }
    
    this.skipWhitespaceAndComments();
    
    // Skip return type if present
    if (this.peek() === '-' && this.peek(1) === '>') {
      this.advance(); // skip '-'
      this.advance(); // skip '>'
      this.skipWhitespaceAndComments();
      
      // Skip return type (could be complex like vec4<f32>)
      while (this.position < this.code.length && 
             this.peek() !== '{' && 
             !/\s/.test(this.peek())) {
        if (this.peek() === '<') {
          // Skip generic parameters
          let angleCount = 1;
          this.advance();
          while (this.position < this.code.length && angleCount > 0) {
            if (this.peek() === '<') angleCount++;
            else if (this.peek() === '>') angleCount--;
            this.advance();
          }
        } else {
          this.advance();
        }
      }
    }
    
    this.skipWhitespaceAndComments();
    
    // Find function body
    const bodyEnd = this.findMatchingBrace();
    if (bodyEnd === -1) {
      this.position = start;
      return null;
    }
    
    const functionCode = this.code.slice(start, bodyEnd).trim();
    return functionCode;
  }

  parse() {
    while (this.position < this.code.length) {
      this.skipWhitespaceAndComments();
      
      if (this.position >= this.code.length) break;
      
      const fnCode = this.parseFunction();
      if (fnCode) {
        this.functions.push(fnCode);
      } else {
        // Not a function, add to body
        const lineStart = this.position;
        while (this.position < this.code.length && this.peek() !== '\n') {
          this.advance();
        }
        if (this.peek() === '\n') this.advance();
        
        const line = this.code.slice(lineStart, this.position).trim();
        if (line) {
          this.body.push(line);
        }
      }
    }
    
    return {
      functions: this.functions,
      body: this.body.join('\n')
    };
  }
}

export function extractFunctionsAndBody(code) {
  try {
    const parser = new WGSLParser(code);
    return parser.parse();
  } catch (error) {
    console.warn('Parser failed, falling back to simple approach:', error);
    
    // Fallback: simple splitting approach
    const lines = code.split('\n').map(line => line.trim()).filter(line => line);
    const functions = [];
    const body = [];
    
    let inFunction = false;
    let braceCount = 0;
    let currentFunction = [];
    
    for (const line of lines) {
      if (line.startsWith('fn ')) {
        inFunction = true;
        currentFunction = [line];
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (inFunction) {
        currentFunction.push(line);
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        
        if (braceCount === 0) {
          functions.push(currentFunction.join('\n'));
          inFunction = false;
          currentFunction = [];
        }
      } else {
        body.push(line);
      }
    }
    
    return {
      functions,
      body: body.join('\n')
    };
  }
}

class WGSLBuilder {
  constructor() {
    this.functions = [];
    this.bindings = [];
    this.structs = [];
  }

  fn(name, params, returnType, body) {
    const fnCode = `fn ${name}(${params}) -> ${returnType} {\n${body}\n}`;
    this.functions.push(fnCode);
    return this; // for chaining
  }

  binding(group, binding, type, name) {
    this.bindings.push(`@group(${group}) @binding(${binding}) var ${name}: ${type};`);
    return this;
  }

  struct(name, body) {
    this.structs.push(`struct ${name} {\n${body}\n}`);
    return this;
  }

  get main() {
    // Return a template literal function
    return (strings, ...values) => {
      // Build the complete code
      let code = '';
      
      // Add bindings
      if (this.bindings.length > 0) {
        code += this.bindings.join('\n') + '\n\n';
      }
      
      // Add structs
      if (this.structs.length > 0) {
        code += this.structs.join('\n\n') + '\n\n';
      }
      
      // Add functions
      if (this.functions.length > 0) {
        code += this.functions.join('\n\n') + '\n\n';
      }
      
      // Add main body from template literal
      const mainBody = String.raw({ raw: strings }, ...values);
      code += mainBody;
      
      // Check if main function already exists
      if (/fn\s+main\s*\(/.test(code)) {
        return code;
      }
      
      // Use existing parser to separate any remaining functions from body
      const { functions: parsedFunctions, body } = extractFunctionsAndBody(code);
      
      // Build final result
      let result = '';
      
      if (parsedFunctions.length > 0) {
        result += parsedFunctions.join('\n\n') + '\n\n';
      }
      
      result += '@compute @workgroup_size(1)\n';
      result += 'fn main(@builtin(global_invocation_id) id: vec3<u32>) {\n';
      
      if (body) {
        const indentedBody = body.split('\n')
          .map(line => line.trim() ? '  ' + line : line)
          .join('\n');
        result += indentedBody + '\n';
      }
      
      result += '}';
      
      return result;
    };
  }
}

// Original template literal function
export function wgsl(strings, ...values) {
  let code = String.raw({ raw: strings }, ...values);

  // Replace width and height placeholders
  code = code.replace(/\bwidth\b/g, width.toFixed(2));
  code = code.replace(/\bheight\b/g, height.toFixed(2));

  // If code uses noise or noise2, inject the noise function implementation
  if (/\bnoise\s*\(|\bnoise2\s*\(|\bnoise3\s*\(/.test(code)) {
    // Only add if not already present
    if (!/fn\s+noise\s*\(/.test(code) && !/fn\s+noise2\s*\(/.test(code) && !/fn\s+noise3\s*\(/.test(code)) {
      code = getNoiseCode() + '\n\n' + code;
    }
  }

  // Remove leading/trailing whitespace but preserve internal structure
  code = code.trim();
  
  // If user already wrote main function, return as-is
  if (/fn\s+main\s*\(/.test(code)) {
    return code;
  }
  
  // Extract helper functions and body
  const { functions, body } = extractFunctionsAndBody(code);
  
  // Build the final WGSL code
  let result = '';
  
  // Add functions first
  if (functions.length > 0) {
    result += functions.join('\n\n') + '\n\n';
  }
  
  // Add main function with body
  result += '@compute @workgroup_size(1)\n';
  result += 'fn main(@builtin(global_invocation_id) id: vec3<u32>) {\n';
  
  if (body) {
    // Indent the body
    const indentedBody = body.split('\n')
      .map(line => line.trim() ? '  ' + line : line)
      .join('\n');
    result += indentedBody + '\n';
  }
  
  result += '}';
  
  return result;
}

// Add compute builder to wgsl
wgsl.compute = () => new WGSLBuilder();
// Allow setting width for parsing stage
wgsl.setWidth = (value) => { wgsl.width = value; };