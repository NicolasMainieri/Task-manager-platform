const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let token = '';
let userId = '';
let companyId = '';

async function login() {
  console.log('\n🔐 TEST: Login SuperAdmin');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@planora.com',
      password: 'superadmin123'
    });

    token = response.data.token;
    const user = response.data.user;
    userId = user.id;
    companyId = user.companyId;

    console.log('✅ Login successful');
    console.log('   User:', user.nome, user.cognome);
    console.log('   Email:', user.email);
    console.log('   Is SuperAdmin:', user.isSuperAdmin);
    console.log('   Company ID:', companyId);
    console.log('   Role:', user.role?.nome);
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSuperAdminStats() {
  console.log('\n📊 TEST: SuperAdmin Stats');
  try {
    const response = await axios.get(`${BASE_URL}/superadmin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Stats retrieved:');
    console.log('   Total Companies:', response.data.totalCompanies);
    console.log('   Total Users:', response.data.totalUsers);
    console.log('   Total Tasks:', response.data.totalTasks);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testCompaniesWithModules() {
  console.log('\n🏢 TEST: Companies and Modules');
  try {
    const response = await axios.get(`${BASE_URL}/superadmin/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Found ${response.data.length} companies:`);
    response.data.forEach(company => {
      console.log(`\n   Company: ${company.nome}`);
      console.log(`   Category: ${company.categoria}`);
      console.log(`   Plan: ${company.plan}`);
      console.log(`   Active Modules: ${company.moduliAttivi.length}`);
      if (company.moduliAttivi.length > 0) {
        console.log(`   Modules: ${company.moduliAttivi.join(', ')}`);
      }
    });
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLegalAccess() {
  console.log('\n⚖️ TEST: Legal Module Access');
  try {
    const response = await axios.get(`${BASE_URL}/legal/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Legal module accessible');
    console.log(`   Chats found: ${response.data.length}`);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('   ⚠️  Module not active for this company');
    }
    return false;
  }
}

async function testTasksEndpoint() {
  console.log('\n📋 TEST: Tasks Endpoint');
  try {
    const response = await axios.get(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Tasks retrieved');
    console.log(`   Tasks found: ${response.data.length}`);
    if (response.data.length > 0) {
      console.log(`   First task: ${response.data[0].titolo}`);
    }
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function activateLegalModule() {
  console.log('\n🔧 TEST: Activate Legal Module');
  try {
    // Prima ottieni l'ID di un'azienda
    const companiesRes = await axios.get(`${BASE_URL}/superadmin/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (companiesRes.data.length === 0) {
      console.log('⚠️  No companies found');
      return false;
    }

    const company = companiesRes.data[0];
    console.log(`   Activating for: ${company.nome}`);

    // Attiva il modulo studi_legali
    const modules = [...company.moduliAttivi];
    if (!modules.includes('studi_legali')) {
      modules.push('studi_legali');
    }

    const response = await axios.put(
      `${BASE_URL}/superadmin/companies/${company.id}/modules`,
      { moduliAttivi: modules },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Module activated');
    console.log(`   Active modules: ${response.data.moduliAttivi.join(', ')}`);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 COMPLETE BACKEND TEST SUITE');
  console.log('═══════════════════════════════════════════');

  const results = [];

  // Test 1: Login
  const loginSuccess = await login();
  results.push({ name: 'Login SuperAdmin', success: loginSuccess });
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without login');
    return;
  }

  // Test 2: SuperAdmin Stats
  results.push({
    name: 'SuperAdmin Stats',
    success: await testSuperAdminStats()
  });

  // Test 3: Companies and Modules
  results.push({
    name: 'Companies & Modules',
    success: await testCompaniesWithModules()
  });

  // Test 4: Tasks
  results.push({
    name: 'Tasks Endpoint',
    success: await testTasksEndpoint()
  });

  // Test 5: Legal Access (might fail if module not active)
  results.push({
    name: 'Legal Module Access',
    success: await testLegalAccess()
  });

  // Test 6: Activate Legal Module
  results.push({
    name: 'Activate Legal Module',
    success: await activateLegalModule()
  });

  // Test 7: Legal Access (retry after activation)
  results.push({
    name: 'Legal Module Access (retry)',
    success: await testLegalAccess()
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
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed`);
  }

  console.log('\n═══════════════════════════════════════════\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
});
