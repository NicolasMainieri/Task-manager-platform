const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let token = '';

async function login() {
  console.log('\n🔐 TEST 1: Login SuperAdmin');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@planora.com',
      password: 'superadmin123'
    });

    token = response.data.token;
    console.log('✅ Login successful');
    console.log('👤 User:', response.data.user.nome, response.data.user.cognome);
    console.log('🔑 SuperAdmin:', response.data.user.isSuperAdmin);
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetModules() {
  console.log('\n📦 TEST 2: GET /superadmin/modules');
  try {
    const response = await axios.get(`${BASE_URL}/superadmin/modules`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Moduli disponibili: ${response.data.length}`);
    response.data.slice(0, 3).forEach(m => {
      console.log(`  - ${m.nome} (${m.id})`);
    });
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetStats() {
  console.log('\n📊 TEST 3: GET /superadmin/stats');
  try {
    const response = await axios.get(`${BASE_URL}/superadmin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Statistiche globali:');
    console.log(`  - Aziende totali: ${response.data.totalCompanies}`);
    console.log(`  - Utenti totali: ${response.data.totalUsers}`);
    console.log(`  - Task totali: ${response.data.totalTasks}`);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetCompanies() {
  console.log('\n🏢 TEST 4: GET /superadmin/companies');
  try {
    const response = await axios.get(`${BASE_URL}/superadmin/companies`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Aziende trovate: ${response.data.length}`);
    if (response.data.length > 0) {
      const company = response.data[0];
      console.log(`  - ${company.nome} (Plan: ${company.plan})`);
      console.log(`  - Categoria: ${company.categoria}`);
      console.log(`  - Moduli attivi: ${company.moduliAttivi.length}`);
    }
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLegalChats() {
  console.log('\n⚖️ TEST 5: GET /legal/chats');
  try {
    const response = await axios.get(`${BASE_URL}/legal/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Chat legali: ${response.data.length}`);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════');
  console.log('🧪 AUTOTEST BACKEND API');
  console.log('═══════════════════════════════════');

  const results = [];

  results.push(await login());
  if (!results[0]) {
    console.log('\n❌ Login failed, stopping tests');
    return;
  }

  results.push(await testGetModules());
  results.push(await testGetStats());
  results.push(await testGetCompanies());
  results.push(await testLegalChats());

  console.log('\n═══════════════════════════════════');
  console.log('📊 RISULTATI FINALI');
  console.log('═══════════════════════════════════');

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\n✅ Test passati: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 TUTTI I TEST SONO PASSATI!');
    console.log('✅ Backend funziona correttamente');
    console.log('🚀 Pronto per il frontend');
  } else {
    console.log('\n⚠️  Alcuni test hanno fallito');
  }

  console.log('\n═══════════════════════════════════\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
});
