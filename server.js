import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Store sessions
const sessions = new Map();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.options('*', cors());
app.use(express.json());

// Add keep-alive and proper headers
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=100');
  next();
});

// Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'DuckDuckGo Search MCP Server',
    version: '1.0.0',
    transport: 'http',
    status: 'running',
    description: 'Web search using DuckDuckGo - no API key required',
    protocolVersion: '2024-11-05',
    endpoints: {
      mcp: '/mcp',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    sessions: sessions.size
  });
});

// Diagnostic endpoint for testing full MCP flow
app.get('/test', async (req, res) => {
  const tests = [];
  
  // Test 1: Initialize
  try {
    const initResponse = await testMcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    });
    tests.push({ test: 'initialize', status: 'passed', response: initResponse });
  } catch (error) {
    tests.push({ test: 'initialize', status: 'failed', error: error.message });
  }
  
  // Test 2: Tools list
  try {
    const toolsResponse = await testMcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });
    tests.push({ test: 'tools/list', status: 'passed', response: toolsResponse });
  } catch (error) {
    tests.push({ test: 'tools/list', status: 'failed', error: error.message });
  }
  
  res.json({
    status: 'diagnostics',
    timestamp: new Date().toISOString(),
    tests: tests
  });
});

// Helper for diagnostic tests
async function testMcpRequest(request) {
  // Simulate internal MCP request handling
  return new Promise((resolve) => {
    if (request.method === 'initialize') {
      resolve({
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'duckduckgo-search-mcp', version: '1.0.0' }
      });
    } else if (request.method === 'tools/list') {
      resolve({
        tools: [{
          name: 'search_web',
          description: 'Search the web using DuckDuckGo',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              max_results: { type: 'number', default: 5 }
            },
            required: ['query']
          }
        }]
      });
    }
  });
}

// Main MCP endpoint
app.post('/mcp', async (req, res) => {
  const startTime = Date.now();
  
  // Set timeout for the response
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  
  try {
    const request = req.body;
    
    console.log('=== MCP REQUEST ===');
    console.log(JSON.stringify(request, null, 2));
    
    // Validate JSON-RPC
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be 2.0'
        }
      });
    }

    // Handle notifications (no response needed)
    if (!request.id) {
      console.log('Notification received:', request.method);
      
      // Specific handling for common notifications
      if (request.method === 'notifications/initialized') {
        console.log('Client initialized successfully');
      } else if (request.method === 'notifications/cancelled') {
        console.log('Request cancelled by client');
      }
      
      return res.status(204).end();
    }

    let result;
    const method = request.method;
    
    switch (method) {
      case 'initialize':
        console.log('=== INITIALIZE ===');
        const sessionId = Math.random().toString(36).substring(7);
        sessions.set(sessionId, {
          initialized: true,
          timestamp: new Date().toISOString()
        });
        
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'duckduckgo-search-mcp',
            version: '1.0.0',
          },
        };
        break;

      case 'tools/list':
        console.log('=== TOOLS/LIST ===');
        result = {
          tools: [
            {
              name: 'search_web',
              description: 'Search the web using DuckDuckGo. Returns titles, URLs, and snippets from search results. Great for finding information, articles, news, and general web content.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query to look up on DuckDuckGo',
                  },
                  max_results: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 5, max: 10)',
                    default: 5,
                    minimum: 1,
                    maximum: 10,
                  },
                },
                required: ['query'],
              },
            },
          ],
        };
        break;

      case 'tools/call':
        console.log('=== TOOLS/CALL ===');
        const toolName = request.params?.name;
        
        if (toolName === 'search_web') {
          result = await handleSearch(request.params?.arguments || {});
        } else {
          throw {
            code: -32601,
            message: `Unknown tool: ${toolName}`,
          };
        }
        break;

      case 'ping':
        result = {};
        break;

      default:
        throw {
          code: -32601,
          message: `Method not found: ${method}`,
        };
    }

    const response = {
      jsonrpc: '2.0',
      id: request.id,
      result: result,
    };
    
    console.log('=== RESPONSE ===');
    console.log(JSON.stringify(response, null, 2));
    console.log(`Completed in ${Date.now() - startTime}ms\n`);
    
    res.json(response);

  } catch (error) {
    console.error('=== ERROR ===');
    console.error(error);
    
    // Ensure we don't send if headers already sent
    if (res.headersSent) {
      console.error('Headers already sent, cannot send error response');
      return;
    }
    
    const errorResponse = {
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: error.code || -32603,
        message: error.message || 'Internal error',
        data: error.data,
      }
    };
    
    console.log('Error response:', JSON.stringify(errorResponse, null, 2));
    
    // Always return 200 for JSON-RPC errors (not HTTP errors)
    res.status(200).json(errorResponse);
  }
});

// Search implementation using DuckDuckGo
async function handleSearch(args) {
  const query = String(args.query || '').trim();
  const maxResults = Math.min(Number(args.max_results) || 5, 10);

  console.log(`Searching DuckDuckGo for: "${query}" (max: ${maxResults})`);

  if (!query) {
    throw {
      code: -32602,
      message: 'Invalid params: query is required',
    };
  }

  try {
    // Use DuckDuckGo's HTML search (no API key needed)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned status ${response.status}`);
    }

    const html = await response.text();
    
    // Parse results from HTML (simple regex-based parsing)
    const results = parseSearchResults(html, maxResults);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No results found for "${query}". Try a different search query.`,
          },
        ],
      };
    }

    // Format results as markdown
    let markdown = `# Search Results for "${query}"\n\n`;
    markdown += `Found ${results.length} result(s):\n\n`;
    
    results.forEach((result, index) => {
      markdown += `## ${index + 1}. ${result.title}\n\n`;
      markdown += `**URL:** ${result.url}\n\n`;
      if (result.snippet) {
        markdown += `${result.snippet}\n\n`;
      }
      markdown += '---\n\n';
    });

    console.log(`Found ${results.length} results`);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      _meta: {
        query: query,
        resultsCount: results.length,
        maxResults: maxResults,
        source: 'DuckDuckGo',
      }
    };

  } catch (error) {
    console.error('Search failed:', error.message);
    
    if (error.name === 'AbortError') {
      throw {
        code: -32000,
        message: 'Search timeout: DuckDuckGo took too long to respond',
      };
    }
    
    throw {
      code: -32000,
      message: `Search failed: ${error.message}`,
    };
  }
}

// Parse search results from DuckDuckGo HTML
function parseSearchResults(html, maxResults) {
  const results = [];
  
  try {
    // Find all result divs (DuckDuckGo uses class "result")
    const resultRegex = /<div class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    const matches = [...html.matchAll(resultRegex)];
    
    for (let i = 0; i < Math.min(matches.length, maxResults); i++) {
      const resultHtml = matches[i][1];
      
      // Extract title and URL
      const titleMatch = resultHtml.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      
      // Extract snippet
      const snippetMatch = resultHtml.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      
      if (titleMatch) {
        const url = cleanUrl(titleMatch[1]);
        const title = cleanText(titleMatch[2]);
        const snippet = snippetMatch ? cleanText(snippetMatch[1]) : '';
        
        if (url && title) {
          results.push({
            title: title,
            url: url,
            snippet: snippet,
          });
        }
      }
    }
    
    // Fallback: try alternative parsing if no results found
    if (results.length === 0) {
      const linkRegex = /<a[^>]*class="result__url"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
      const linkMatches = [...html.matchAll(linkRegex)];
      
      for (let i = 0; i < Math.min(linkMatches.length, maxResults); i++) {
        const url = cleanUrl(linkMatches[i][1]);
        const title = cleanText(linkMatches[i][2]) || url;
        
        if (url) {
          results.push({
            title: title,
            url: url,
            snippet: '',
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error parsing results:', error);
  }
  
  return results;
}

// Clean URL from DuckDuckGo redirect
function cleanUrl(url) {
  try {
    // DuckDuckGo uses redirect URLs like: //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com
    if (url.includes('uddg=')) {
      const match = url.match(/uddg=([^&]*)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    
    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    return url;
  } catch (error) {
    return url;
  }
}

// Clean HTML text
function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🦆 DuckDuckGo Search MCP Server running`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Protocol version: 2024-11-05`);
  console.log(`🔍 Ready to search the web!\n`);
});
