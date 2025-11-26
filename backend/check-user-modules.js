const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function checkUserModules() {
  console.log('\n🔍 VERIFICA MODULI UTENTE VALIOR CAPITAL');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Login come admin Valior
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'info@valiorcapital.com',
      password: 'ValiorCapital2024!'
    });

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;

    console.log('✅ Login successful');
    console.log(`   User: ${user.nome} ${user.cognome}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Company ID: ${user.companyId}`);
    console.log(`   Role: ${user.role?.nome}`);
    console.log('');

    // Prendi i dettagli della company
    if (user.company) {
      console.log('📦 Company Info:');
      console.log(`   Name: ${user.company.nome}`);
      console.log(`   Plan: ${user.company.plan}`);
      console.log(`   Active Modules:`, user.company.moduliAttivi);
      console.log('');
    }

    // Verifica direttamente dal SuperAdmin
    const superToken = await getSuperAdminToken();
    const companies = await axios.get(`${BASE_URL}/superadmin/companies`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });

    const valior = companies.data.find(c => c.nome.includes('Valior'));
    if (valior) {
      console.log('🔍 Company from SuperAdmin API:');
      console.log(`   Name: ${valior.nome}`);
      console.log(`   Active Modules: ${valior.moduliAttivi.length}`);
      console.log(`   Modules List:`);
      valior.moduliAttivi.forEach(m => console.log(`      - ${m}`));
      console.log('');
      console.log(`   ⚖️  Legal Module Active: ${valior.moduliAttivi.includes('studi_legali') ? '✅ YES' : '❌ NO'}`);
    }

  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Password might be wrong. Trying with admin@valior.com...\n');

      try {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: 'admin@valior.com',
          password: 'admin123'
        });

        const user = loginResponse.data.user;
        console.log('✅ Login successful with admin@valior.com');
        console.log(`   Company ID: ${user.companyId}`);

        if (user.company) {
          console.log(`   Company: ${user.company.nome}`);
          console.log(`   Modules:`, user.company.moduliAttivi);
        }
      } catch (e) {
        console.log('❌ Also failed with admin@valior.com');
      }
    }
  }
}

async function getSuperAdminToken() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'superadmin@planora.com',
    password: 'superadmin123'
  });
  return response.data.token;
}

checkUserModules();
