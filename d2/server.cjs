require('dotenv').config();

const fs = require('fs');
const path = require('path');
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

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

if (!process.env.SENDER_EMAIL) {
  throw new Error('SENDER_EMAIL is not set');
}

const serviceAccountPath = path.resolve(
  __dirname,
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Firebase service account file not found: ${serviceAccountPath}`);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const users = db.collection('users');
const posts = db.collection('posts');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();

app.use(express.json({ limit: '50kb' }));

const PORT = process.env.PORT || 3000;

const emailPattern = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

const isValidEmail = (value) =>
  typeof value === 'string' &&
  value.length <= 254 &&
  emailPattern.test(value);

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

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
    return res.status(401).json({
      message: 'Authentication required.',
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );

    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({
      message: 'Your session has expired. Please log in again.',
    });
  }
};

const parseTags = (rawTags) => {
  const list = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string'
      ? rawTags.split(',')
      : [];

  const cleaned = [];
  const seen = new Set();

  for (const item of list) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized) continue;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleaned.push(normalized);
    }
  }

  return cleaned;
};

const serializeTimestamp = (value, fallbackIso) => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value) {
    return value;
  }
  return fallbackIso || new Date(0).toISOString();
};

app.post('/subscribe', async (req, res) => {
  const { email } = req.body || {};

  if (
    typeof email !== 'string' ||
    !isValidEmail(email.trim())
  ) {
    return res.status(400).json({
      message: 'Please enter a valid email address.',
    });
  }

  const msg = {
    to: email.trim(),
    from: process.env.SENDER_EMAIL,
    subject: 'Welcome to DEV@Deakin',
    text: 'Thanks for subscribing to DEV@Deakin. You will now receive our daily insider updates.',
    html: '<p>Thanks for subscribing to <strong>DEV@Deakin</strong>. You will now receive our daily insider updates.</p>',
  };

  try {
    const response = await sgMail.send(msg);

    console.log('SendGrid status:', response[0].statusCode);

    return res.status(202).json({
      message: 'Subscribed successfully.',
    });
  } catch (error) {
    console.error('SendGrid Error:', error.response?.body || error.message);

    return res.status(500).json({
      message: 'Failed to send email. Please try again.',
    });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password
  ) {
    return res.status(400).json({
      message: 'Please fill in every field.',
    });
  }

  const emailKey = email.trim().toLowerCase();

  if (!isValidEmail(emailKey)) {
    return res.status(400).json({
      message: 'Please enter a valid email address.',
    });
  }

  if (password.length < 6 || password.length > 72) {
    return res.status(400).json({
      message: 'Password must be between 6 and 72 characters.',
    });
  }

  const [firstName, ...rest] = name.trim().split(/\s+/);

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    await users.doc(emailKey).create({
      firstName,
      lastName: rest.join(' '),
      email: emailKey,
      password: passwordHash,
      plan: 'free',
      createdAt: new Date().toISOString(),
    });

    console.log('New user registered:', emailKey);

    return res.status(201).json({
      message: 'Account created successfully.',
    });
  } catch (error) {
    if (error.code === 6) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration Error:', error);

    return res.status(500).json({
      message: 'Could not create the account. Please try again.',
    });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return res.status(400).json({
      message: 'Please enter your email and password.',
    });
  }

  const emailKey = email.trim().toLowerCase();

  if (!isValidEmail(emailKey)) {
    return res.status(401).json({
      message: 'Incorrect email or password.',
    });
  }

  let stage = 'Firestore lookup';

  try {
    console.log('Login attempt:', emailKey);

    const snapshot = await users.doc(emailKey).get();

    if (!snapshot.exists) {
      console.log('User not found:', emailKey);

      return res.status(401).json({
        message: 'Incorrect email or password.',
      });
    }

    const data = snapshot.data();

    stage = 'Password verification';

    if (
      typeof data.password !== 'string' ||
      !data.password.startsWith('$2')
    ) {
      console.error('Invalid or missing bcrypt password hash.');

      return res.status(500).json({
        message: 'Account password data is invalid.',
      });
    }

    const matches = await bcrypt.compare(password, data.password);

    if (!matches) {
      return res.status(401).json({
        message: 'Incorrect email or password.',
      });
    }

    stage = 'JWT generation';

    const token = jwt.sign(
      { sub: emailKey },
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '2h',
      }
    );

    console.log('Login successful:', emailKey);

    return res.json({
      token,
      user: publicUser(data),
    });
  } catch (error) {
    console.error(`LOGIN ERROR at ${stage}:`);
    console.error(error);

    return res.status(500).json({
      message: 'Could not log in. Please try again.',
    });
  }
});

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const snapshot = await users.doc(req.userId).get();

    if (!snapshot.exists) {
      return res.status(401).json({
        message: 'Account not found.',
      });
    }

    return res.json({
      user: publicUser(snapshot.data()),
    });
  } catch (error) {
    console.error('User verification error:', error);

    return res.status(500).json({
      message: 'Could not load your account.',
    });
  }
});

app.post('/api/subscription/upgrade', authenticate, async (req, res) => {
  const { customerName } = req.body || {};

  if (
    typeof customerName !== 'string' ||
    !customerName.trim() ||
    customerName.length > 100
  ) {
    return res.status(400).json({
      message: 'Please enter the name on the card.',
    });
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

    return res.json({
      message: 'Upgrade successful.',
      plan: 'paid',
      reference,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error('Subscription upgrade error:', error);

    return res.status(500).json({
      message: 'Could not complete the upgrade. Please try again.',
    });
  }
});

app.post('/api/posts', authenticate, async (req, res) => {
  try {
    const userSnapshot = await users.doc(req.userId).get();

    if (!userSnapshot.exists) {
      return res.status(401).json({
        message: 'Account not found. Please log in again.',
      });
    }

    const userData = userSnapshot.data();
    const userPlan = userData.plan === 'paid' ? 'paid' : 'free';

    const {
      postType,
      postPlan,
      title,
      details,
      description,
      abstract,
      articleText,
      tags,
    } = req.body || {};

    if (postType !== 'question' && postType !== 'article') {
      return res.status(400).json({
        message: 'Please select a valid post type (Question or Article).',
      });
    }

    if (postPlan !== 'free' && postPlan !== 'paid') {
      return res.status(400).json({
        message: 'Please select a valid post plan (Free or Paid).',
      });
    }

    if (postPlan === 'paid' && userPlan !== 'paid') {
      return res.status(403).json({
        message: 'Only Paid plan subscribers can create Paid posts. Please upgrade your plan first.',
      });
    }

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
      return res.status(400).json({
        message: 'Title must be between 3 and 150 characters.',
      });
    }

    const parsedTags = parseTags(tags);
    if (parsedTags.length === 0) {
      return res.status(400).json({
        message: 'Please add at least one tag.',
      });
    }

    if (parsedTags.length > 3) {
      return res.status(400).json({
        message: 'You can add a maximum of 3 tags.',
      });
    }

    if (parsedTags.some((tag) => tag.length > 30)) {
      return res.status(400).json({
        message: 'Each tag must be 30 characters or fewer.',
      });
    }

    let trimmedDetails = '';
    let trimmedAbstract = '';
    let trimmedArticleText = '';

    if (postType === 'question') {
      const rawQuestionBody =
        typeof details === 'string' && details.trim()
          ? details
          : typeof description === 'string'
            ? description
            : '';
      trimmedDetails = rawQuestionBody.trim();
      if (trimmedDetails.length < 5 || trimmedDetails.length > 5000) {
        return res.status(400).json({
          message: 'Question problem description must be between 5 and 5000 characters.',
        });
      }
    } else {
      trimmedAbstract = typeof abstract === 'string' ? abstract.trim() : '';
      trimmedArticleText = typeof articleText === 'string' ? articleText.trim() : '';

      if (trimmedAbstract.length < 5 || trimmedAbstract.length > 1000) {
        return res.status(400).json({
          message: 'Article abstract must be between 5 and 1000 characters.',
        });
      }

      if (trimmedArticleText.length < 10 || trimmedArticleText.length > 20000) {
        return res.status(400).json({
          message: 'Article text must be between 10 and 20000 characters.',
        });
      }
    }

    const createdAtIso = new Date().toISOString();
    const authorName =
      [userData.firstName, userData.lastName].filter(Boolean).join(' ').trim() ||
      userData.email ||
      req.userId;

    const newPost = {
      userId: req.userId,
      authorName,
      postType,
      postPlan,
      title: trimmedTitle,
      details: trimmedDetails,
      abstract: trimmedAbstract,
      articleText: trimmedArticleText,
      tags: parsedTags,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso,
    };

    const docRef = await posts.add(newPost);

    return res.status(201).json({
      message: 'Your post has been published and saved to Firestore.',
      post: {
        id: docRef.id,
        userId: req.userId,
        authorName,
        postType,
        postPlan,
        title: trimmedTitle,
        details: trimmedDetails,
        abstract: trimmedAbstract,
        articleText: trimmedArticleText,
        tags: parsedTags,
        createdAt: createdAtIso,
      },
    });
  } catch (error) {
    console.error('Create post error:', error);

    return res.status(500).json({
      message: 'Could not save your post. Please try again.',
    });
  }
});

app.get('/api/posts', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  let effectivePlan = 'free';

  if (token) {
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET,
        { algorithms: ['HS256'] }
      );

      const userSnapshot = await users.doc(payload.sub).get();
      if (!userSnapshot.exists) {
        return res.status(401).json({
          message: 'Account not found. Please log in again.',
        });
      }

      const userData = userSnapshot.data();
      if (userData.plan === 'paid') {
        effectivePlan = 'paid';
      }
    } catch {
      return res.status(401).json({
        message: 'Your session has expired. Please log in again.',
      });
    }
  }

  try {
    let query = posts;
    if (effectivePlan !== 'paid') {
      query = query.where('postPlan', '==', 'free');
    }

    const snapshot = await query.get();

    const loadedPosts = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const postPlan = data.postPlan === 'paid' ? 'paid' : 'free';
        if (effectivePlan !== 'paid' && postPlan !== 'free') {
          return null;
        }

        return {
          id: doc.id,
          userId: data.userId || '',
          authorName: data.authorName || data.userId || 'Anonymous',
          postType: data.postType === 'article' ? 'article' : 'question',
          postPlan,
          title: data.title || '',
          details: data.details || data.description || '',
          abstract: data.abstract || '',
          articleText: data.articleText || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: serializeTimestamp(data.createdAt, data.createdAtIso),
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      plan: effectivePlan,
      posts: loadedPosts,
    });
  } catch (error) {
    console.error('Fetch posts error:', error);

    return res.status(500).json({
      message: 'Could not load posts from the server.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});