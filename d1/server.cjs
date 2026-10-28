require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))),
});
const db = getFirestore();
const users = db.collection('users');

const app = express();
app.use(express.json());

app.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: 'Welcome to DEV@Deakin',
    text: 'Thanks for subscribing to DEV@Deakin. You will now receive our daily insider updates.',
    html: '<p>Thanks for subscribing to <strong>DEV@Deakin</strong>. You will now receive our daily insider updates.</p>'
  };

  try {
    const response = await sgMail.send(msg);
    console.log('SendGrid status:', response[0].statusCode);
    res.status(202).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

const emailPattern = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

const isValidEmail = (value) =>
  typeof value === 'string' && value.length <= 254 && emailPattern.test(value);

const httpError = (status, message) => Object.assign(new Error(message), { status });

const publicUser = (data) => ({
  email: data.email,
  firstName: data.firstName,
  lastName: data.lastName,
  plan: data.plan || 'free',
});

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
};

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password
  ) {
    return res.status(400).json({ message: 'Please fill in every field.' });
  }

  const emailKey = email.trim().toLowerCase();
  if (!isValidEmail(emailKey)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (password.length < 6 || password.length > 72) {
    return res.status(400).json({ message: 'Password must be between 6 and 72 characters.' });
  }

  const [firstName, ...rest] = name.trim().split(/\s+/);

  try {
    await users.doc(emailKey).create({
      firstName,
      lastName: rest.join(' '),
      email: emailKey,
      password: await bcrypt.hash(password, 10),
      plan: 'free',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ message: 'Account created successfully.' });
  } catch (error) {
    if (error.code === 6) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Could not create the account. Please try again.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Please enter your email and password.' });
  }

  const emailKey = email.trim().toLowerCase();
  const invalid = () => res.status(401).json({ message: 'Incorrect email or password.' });

  if (!isValidEmail(emailKey)) {
    return invalid();
  }

  try {
    const snapshot = await users.doc(emailKey).get();
    const data = snapshot.exists ? snapshot.data() : null;
    const matches = data && data.password && (await bcrypt.compare(password, data.password));

    if (!matches) {
      return invalid();
    }

    const token = jwt.sign({ sub: emailKey }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '2h',
    });
    console.log('Login successful:', emailKey);
    res.json({ token, user: publicUser(data) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not log in. Please try again.' });
  }
});

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const snapshot = await users.doc(req.userId).get();
    if (!snapshot.exists) {
      return res.status(401).json({ message: 'Account not found.' });
    }
    res.json({ user: publicUser(snapshot.data()) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load your account.' });
  }
});

app.post('/api/subscription/upgrade', authenticate, async (req, res) => {
  const { customerName } = req.body || {};

  if (typeof customerName !== 'string' || !customerName.trim() || customerName.length > 100) {
    return res.status(400).json({ message: 'Please enter the name on the card.' });
  }

  const ref = users.doc(req.userId);
  const reference = `SIM-${crypto.randomUUID()}`;

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        throw httpError(401, 'Account not found.');
      }
      if (snapshot.data().plan === 'paid') {
        throw httpError(409, 'You are already on the Paid plan.');
      }

      transaction.update(ref, {
        plan: 'paid',
        upgraded: true,
        upgradedAt: FieldValue.serverTimestamp(),
        payment: {
          method: 'Simulated',
          reference,
          status: 'Successful',
          customerName: customerName.trim(),
        },
      });
    });

    res.json({ message: 'Upgrade successful.', plan: 'paid', reference });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: 'Could not complete the upgrade. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));