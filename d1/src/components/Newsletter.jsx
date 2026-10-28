import { useState } from 'react';

function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Subscription failed. Please try again.');
      }

      setStatus('success');
      setMessage(data.message || 'Subscribed successfully');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(
        err instanceof TypeError
          ? 'Unable to reach the server. Please try again later.'
          : err.message
      );
    }
  };

  const styles = {
    form: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' },
    input: { padding: '10px 12px', minWidth: '240px', border: '1px solid #ccc', borderRadius: '6px' },
    button: {
      padding: '10px 18px',
      border: 'none',
      borderRadius: '6px',
      background: '#2563eb',
      color: '#fff',
      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
      opacity: status === 'loading' ? 0.7 : 1,
    },
    message: {
      marginTop: '10px',
      textAlign: 'center',
      color: status === 'success' ? '#15803d' : '#b91c1c',
    },
  };

  return (
    <section style={{ padding: '24px 16px', textAlign: 'center' }}>
      <h3>Subscribe to our newsletter</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={status === 'loading'}
          style={styles.input}
        />
        <button type="submit" disabled={status === 'loading'} style={styles.button}>
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p role={status === 'error' ? 'alert' : 'status'} style={styles.message}>
          {message}
        </p>
      )}
    </section>
  );
}

export default Newsletter;