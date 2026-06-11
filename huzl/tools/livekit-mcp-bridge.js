const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    sendRequest(request);
  } catch (err) {
    console.error('Error parsing stdin line:', err);
  }
});

function sendRequest(request) {
  const payload = JSON.stringify(request);
  const options = {
    hostname: 'docs.livekit.io',
    path: '/mcp/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      const lines = body.split('\n');
      for (let l of lines) {
        if (l.startsWith('data: ')) {
          const jsonStr = l.slice(6).trim();
          process.stdout.write(jsonStr + '\n');
          return;
        }
      }
      
      const trimmed = body.trim();
      if (trimmed.startsWith('{')) {
        process.stdout.write(trimmed + '\n');
      } else {
        console.error('Bridge: Unrecognized response format:', body);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Bridge request error:', err);
    const errorResponse = {
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32000,
        message: err.message
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  });

  req.write(payload);
  req.end();
}
