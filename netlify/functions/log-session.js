exports.handler = async function(event, context) {
  console.log('Function invoked - method:', event.httpMethod);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  console.log('Body received:', event.body);

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = 'app6jfIbr50JLlJTi';
  const TABLE_NAME = 'Sessions';

  if (!AIRTABLE_API_KEY) {
    console.error('No API key found');
    return { statusCode: 500, body: 'Missing API key' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch(e) {
    console.error('JSON parse error:', e);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  console.log('Parsed data:', JSON.stringify(data));

  const { sessionId, email, entryState, assignments } = data;

  if (!assignments || assignments.length === 0) {
    console.error('No assignments in payload');
    return { statusCode: 400, body: 'No assignments' };
  }

  const records = assignments.map(function(a) {
    return {
      fields: {
        'Session ID': sessionId || '',
        'Entry State': entryState || '',
        'Track ID': a.trackId || '',
        'Duration': a.duration || 0,
        'Post Assignment': a.postState || '',
        'Match': a.match || '',
        'Email': email || '',
        'Week': a.week || 'W01',
      }
    };
  });

  console.log('Sending records to Airtable:', JSON.stringify(records));

  try {
    const response = await fetch(
      'https://api.airtable.com/v0/' + BASE_ID + '/' + encodeURIComponent(TABLE_NAME),
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + AIRTABLE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: records }),
      }
    );

    const result = await response.json();
    console.log('Airtable response status:', response.status);
    console.log('Airtable response:', JSON.stringify(result));

    if (!response.ok) {
      console.error('Airtable error:', result);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, created: result.records.length }),
    };

  } catch(err) {
    console.error('Fetch error:', err);
    return { statusCode: 500, body: err.toString() };
  }
};
