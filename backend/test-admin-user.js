const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let token = '';
let userId = '';
let companyId = '';

async function testAdminLogin() {
  console.log('\n🔐 TEST: Login Admin User (Valior Capital)');
  try {
    // Prima prova a trovare un admin di Valior Capital
    const users = await axios.get(`${BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${await getSuperAdminToken()}` }
    }).catch(() => null);

    // Se non troviamo utenti, proviamo con credenziali comuni
    const testLogins = [
      { email: 'admin@valior.com', password: 'admin123' },
      { email: 'admin@planora.com', password: 'admin123' },
      { email: 'test@valior.com', password: 'test123' }
    ];

    for (const credentials of testLogins) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
        token = response.data.token;
        const user = response.data.user;
        userId = user.id;
        companyId = user.companyId;

        console.log('✅ Login successful');
        console.log('   User:', user.nome, user.cognome);
        console.log('   Email:', user.email);
        console.log('   Company ID:', companyId);
        console.log('   Role:', user.role?.nome);
        console.log('   Is Admin:', user.role?.permessi?.isAdmin);
        return true;
      } catch (err) {
        // Continue to next login attempt
      }
    }

    console.log('❌ No admin user found. Creating one...');
    return await createAdminUser();
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getSuperAdminToken() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'superadmin@planora.com',
    password: 'superadmin123'
  });
  return response.data.token;
}

async function createAdminUser() {
  console.log('\n🔧 Creating admin user for Valior Capital...');
  try {
    const superToken = await getSuperAdminToken();

    // Get Valior Capital ID
    const companies = await axios.get(`${BASE_URL}/superadmin/companies`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });

    const valior = companies.data.find(c => c.nome === 'Valior Capital LTD');
    if (!valior) {
      console.log('❌ Valior Capital not found');
      return false;
    }

    // Get Admin role ID
    const roles = await axios.get(`${BASE_URL}/roles`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });

    const adminRole = roles.data.find(r => r.nome === 'Admin');
    if (!adminRole) {
      console.log('❌ Admin role not found');
      return false;
    }

    // Create admin user
    const newUser = await axios.post(`${BASE_URL}/users`, {
      nome: 'Test',
      cognome: 'Admin',
      email: 'admin@valior.com',
      password: 'admin123',
      companyId: valior.id,
      roleId: adminRole.id
    }, {
      headers: { Authorization: `Bearer ${superToken}` }
    });

    console.log('✅ Admin user created successfully');

    // Now login with new user
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@valior.com',
      password: 'admin123'
    });

    token = response.data.token;
    userId = response.data.user.id;
    companyId = response.data.user.companyId;

    return true;
  } catch (error) {
    console.log('❌ Failed to create admin:', error.response?.data || error.message);
    return false;
  }
}

async function testGetTasks() {
  console.log('\n📋 TEST: GET /tasks');
  try {
    const response = await axios.get(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Tasks retrieved: ${response.data.length}`);
    if (response.data.length > 0) {
      console.log(`   First task: ${response.data[0].titolo}`);
      console.log(`   Task owner: ${response.data[0].owner?.nome} ${response.data[0].owner?.cognome}`);
    } else {
      console.log('   ⚠️  No tasks found for this company');
    }
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testMyTasks() {
  console.log('\n📝 TEST: GET /tasks/my-tasks');
  try {
    const response = await axios.get(`${BASE_URL}/tasks/my-tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ My tasks retrieved: ${response.data.length}`);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLegalChats() {
  console.log('\n⚖️ TEST: GET /legal/chats');
  try {
    const response = await axios.get(`${BASE_URL}/legal/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Legal chats accessible: ${response.data.length} chats`);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('   ⚠️  Module not active for this company');
    }
    return false;
  }
}

async function testCreateLegalChat() {
  console.log('\n💬 TEST: POST /legal/chats');
  try {
    const response = await axios.post(`${BASE_URL}/legal/chats`, {
      titolo: 'Test Legal Chat'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Legal chat created: ${response.data.titolo}`);
    return response.data.id;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 ADMIN USER TEST SUITE');
  console.log('═══════════════════════════════════════════');

  const results = [];

  // Test 1: Login
  const loginSuccess = await testAdminLogin();
  results.push({ name: 'Login Admin User', success: loginSuccess });
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without login');
    return;
  }

  // Test 2: Get Tasks
  results.push({
    name: 'GET /tasks',
    success: await testGetTasks()
  });

  // Test 3: My Tasks
  results.push({
    name: 'GET /tasks/my-tasks',
    success: await testMyTasks()
  });

  // Test 4: Legal Chats
  results.push({
    name: 'GET /legal/chats',
    success: await testLegalChats()
  });

  // Test 5: Create Legal Chat
  const chatId = await testCreateLegalChat();
  results.push({
    name: 'POST /legal/chats',
    success: chatId !== null
  });

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════\n');

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.name}`);
  });

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`\n📈 Total: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Admin user can access tasks and legal module');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed`);
  }

  console.log('\n═══════════════════════════════════════════\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
});
