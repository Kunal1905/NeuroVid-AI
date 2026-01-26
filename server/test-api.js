const http = require('http');

const TEST_USER_ID = 'test-user-123';
const BASE_URL = 'http://localhost:3001/api';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': TEST_USER_ID
      }
    };

    const req = http.request(`${BASE_URL}${path}`, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING API TESTS ---');

  // 1. Create/Update User
  console.log('\nTesting /users/create...');
  const userRes = await request('POST', '/users/create', { email: 'test@example.com' });
  console.log(`Status: ${userRes.status}`, userRes.data);

  // 2. Get User
  console.log('\nTesting /users/me...');
  const meRes = await request('GET', '/users/me');
  console.log(`Status: ${meRes.status}`, meRes.data);

  // 3. Submit Survey (might fail if already done, which is fine)
  console.log('\nTesting /survey/submitSurvey...');
  const surveyRes = await request('POST', '/survey/submitSurvey', {
    leftScore: 50,
    rightScore: 50,
    dominantQuadrant: 'balanced'
  });
  console.log(`Status: ${surveyRes.status}`, surveyRes.data);

  // 4. Get Survey Data
  console.log('\nTesting /survey/surveyData...');
  const surveyDataRes = await request('GET', '/survey/surveyData');
  console.log(`Status: ${surveyDataRes.status}`, surveyDataRes.data);

  // 5. Submit Generation
  console.log('\nTesting /generate/submitGeneration...');
  const genRes = await request('POST', '/generate/submitGeneration', {
   "sessionId": "test-session-123",
   "topic": "AI in Healthcare",
   "details": "Explain AI use cases in hospitals",
   "category": "Education",
   "language": "en",
   "duration": 3
 });
  console.log(`Status: ${genRes.status}`, genRes.data);

  // 6. Get Generation
  console.log('\nTesting /generate/getGeneration...');
  const getGenRes = await request('GET', '/generate/getGeneration');
  console.log(`Status: ${getGenRes.status}`, getGenRes.data);

  console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error);
