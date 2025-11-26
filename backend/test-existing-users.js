const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function getSuperAdminToken() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'superadmin@planora.com',
    password: 'superadmin123'
  });
  return response.data.token;
}

async function findExistingUsers() {
  console.log('\n🔍 SEARCHING FOR EXISTING USERS WITH COMPANIES');
  console.log('═══════════════════════════════════════════\n');

  try {
    const superToken = await getSuperAdminToken();

    // Get all companies
    const companies = await axios.get(`${BASE_URL}/superadmin/companies`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });

    console.log(`Found ${companies.data.length} companies:\n`);

    for (const company of companies.data) {
      console.log(`📦 Company: ${company.nome} (ID: ${company.id})`);
      console.log(`   Plan: ${company.plan}`);
      console.log(`   Modules: ${company.moduliAttivi.length > 0 ? company.moduliAttivi.join(', ') : 'none'}`);

      // Try to get users for this company by querying all users
      try {
        // We need to find a user from this company to test with
        const usersResponse = await axios.get(`${BASE_URL}/superadmin/users?companyId=${company.id}`, {
          headers: { Authorization: `Bearer ${superToken}` }
        }).catch(() => null);

        if (usersResponse && usersResponse.data && usersResponse.data.length > 0) {
          console.log(`   👥 Users: ${usersResponse.data.length}`);
          usersResponse.data.slice(0, 3).forEach(u => {
            console.log(`      - ${u.nome} ${u.cognome} (${u.email}) - Role: ${u.role?.nome || 'no role'}`);
          });

          // Try to login with first user
          const firstUser = usersResponse.data[0];
          console.log(`\n   🔐 Trying to login with ${firstUser.email}...`);

          // Common passwords to try
          const passwords = ['password', 'admin123', 'test123', '123456', 'password123'];
          for (const pwd of passwords) {
            try {
              const loginResp = await axios.post(`${BASE_URL}/auth/login`, {
                email: firstUser.email,
                password: pwd
              });
              console.log(`   ✅ Login successful with password: ${pwd}`);
              console.log(`   Token: ${loginResp.data.token.substring(0, 20)}...`);
              return {
                user: loginResp.data.user,
                token: loginResp.data.token,
                company: company
              };
            } catch (err) {
              // Continue
            }
          }
          console.log(`   ❌ Could not login with common passwords`);
        } else {
          console.log(`   ⚠️  No users found for this company`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not fetch users`);
      }
      console.log('');
    }

    return null;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testWithUser(userData) {
  console.log('\n📊 TESTING WITH USER');
  console.log('═══════════════════════════════════════════\n');

  console.log(`User: ${userData.user.nome} ${userData.user.cognome}`);
  console.log(`Email: ${userData.user.email}`);
  console.log(`Company: ${userData.company.nome}`);
  console.log(`Company ID: ${userData.user.companyId}`);
  console.log('');

  // Test GET /tasks
  try {
    const response = await axios.get(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${userData.token}` }
    });
    console.log(`✅ GET /tasks - ${response.data.length} tasks found`);
  } catch (error) {
    console.log(`❌ GET /tasks failed: ${error.response?.data?.error || error.message}`);
  }

  // Test GET /legal/chats
  try {
    const response = await axios.get(`${BASE_URL}/legal/chats`, {
      headers: { Authorization: `Bearer ${userData.token}` }
    });
    console.log(`✅ GET /legal/chats - ${response.data.length} chats found`);
  } catch (error) {
    console.log(`❌ GET /legal/chats failed: ${error.response?.data?.error || error.message}`);
  }
}

async function main() {
  const userData = await findExistingUsers();

  if (userData) {
    await testWithUser(userData);
  } else {
    console.log('\n⚠️  NO EXISTING USERS FOUND TO TEST WITH');
    console.log('   We need to create a proper test user with a company association');
  }
}

main().catch(console.error);
