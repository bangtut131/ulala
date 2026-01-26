// Utility to create a new Portal User
// Run with: node scripts/create_user.js

const USERNAME = 'it_lead';       // <--- Ganti Username disini
const PASSWORD = 'password123';   // <--- Ganti Password disini
const DIVISION = 'IT';            // <--- Ganti Divisi (IT, Marketing, HR, Finance)

(async () => {
    console.log(`Creating user: ${USERNAME} (${DIVISION})...`);

    try {
        const response = await fetch('http://localhost:3000/api/portal/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: USERNAME,
                password: PASSWORD,
                division: DIVISION
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('\n✅ User Berhasil Dibuat!');
            console.log('-----------------------------------');
            console.log(`Username : ${USERNAME}`);
            console.log(`Password : ${PASSWORD}`);
            console.log(`Division : ${DIVISION}`);
            console.log('-----------------------------------');
            console.log('Silakan login di: http://localhost:5173/portal/login');
        } else {
            console.log('\n❌ Gagal membuat user:');
            console.log(data);
        }

    } catch (err) {
        console.error('\n❌ Error: Pastikan server backend berjalan (port 3000).');
        console.error(err.message);
    }
})();
