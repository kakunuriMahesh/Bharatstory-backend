// TODO: Import Admin logdata into MongoDB

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const importData = async () => {
  try {
    // Connect to Admin DB
    const adminConnection = mongoose.createConnection(process.env.ADMIN_MONGO_URI);
    console.log('Connecting to Admin MongoDB...');
    await new Promise((resolve) => adminConnection.once('connected', resolve));
    console.log('Connected to Admin MongoDB');

    // Define model
    const Admin = adminConnection.model('Admin', adminSchema);

    // Clear existing data (optional)
    await Admin.deleteMany({});
    console.log('Cleared existing admins');

    // Insert admin data
    const adminData = {
      username: 'Uday',
      password: '$2b$10$yiS73JXjWWEa9dG5n0KgTOnA/h93B1Qdpq6sxoyHwaVc1pEMh20xm', // '1@3$5^'
    };
    await Admin.create(adminData);
    console.log('Inserted admin:', adminData);

    // Fetch and verify
    const admins = await Admin.find();
    console.log('All admins in BharatAdminDB > admins:', admins);

    // Close connection
    await adminConnection.close();
    console.log('Connection closed');
  } catch (err) {
    console.error('Error:', err.message);
  }
};

importData();



// TODO: compare password

// const bcrypt = require('bcrypt');

// const storedHash = '$2b$10$5QzX8z5QzX8z5QzX8z5QzX8z5QzX8z5QzX8z5QzX8z5QzX8z5QzX8z';
// const inputPassword = '1@3$5^';

// bcrypt.compare(inputPassword, storedHash, (err, result) => {
//   if (err) {
//     console.error('Error:', err);
//   } else {
//     console.log('Does password "1@3$5^" match stored hash?', result);
//   }
// });


// TODO: genereate hash

// const bcrypt = require('bcrypt');

// const password = '1@3$5^';
// bcrypt.hash(password, 10, (err, hash) => {
//   if (err) {
//     console.error('Error:', err);
//   } else {
//     console.log('New hash for "1@3$5^":', hash);
//   }
// });