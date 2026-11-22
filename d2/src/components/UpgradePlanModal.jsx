import { useEffect, useRef, useState } from "react";

const digitsOnly = (value) => value.replace(/\D/g, "");

const formatCardNumber = (value) =>
  digitsOnly(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (value) => {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const passesLuhn = (number) => {
  let sum = 0;
  let shouldDouble = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const validate = ({ fullName, cardNumber, expiry, cvv }) => {
  const errors = {};

  if (!fullName.trim()) {
    errors.fullName = "Enter the name on the card.";
  }

  const digits = digitsOnly(cardNumber);
  if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) {
    errors.cardNumber = "Enter a valid card number.";
  }

  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  const month = match ? Number(match[1]) : 0;
  if (!match || month < 1 || month > 12) {
    errors.expiry = "Enter the expiry date as MM/YY.";
  } else {
    const year = 2000 + Number(match[2]);
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      errors.expiry = "This card has expired.";
    }
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    errors.cvv = "Enter the 3 or 4 digit security code.";
  }

  return errors;
};

function UpgradePlanModal({ price, upgradePlan, onClose, onSuccess }) {
  const [form, setForm] = useState({ fullName: "", cardNumber: "", expiry: "", cvv: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && !inFlight.current) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;

    const found = validate(form);
    setErrors(found);
    setSubmitError("");
    if (Object.keys(found).length > 0) return;

    inFlight.current = true;
    setSubmitting(true);

    try {
      await upgradePlan(form.fullName.trim());
      onSuccess();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !inFlight.current) onClose();
      }}
    >
      <form
        className="upgrade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="upgrade-title">Upgrade to the Paid plan</h2>
        <p className="upgrade-summary">Paid plan: {price} / month</p>
        <p className="upgrade-simulated">
          This is a simulated payment. No real payment is processed and card details are
          never saved. Test card: 4242 4242 4242 4242.
        </p>

        <label htmlFor="upgrade-name">Name on card</label>
        <input
          id="upgrade-name"
          type="text"
          value={form.fullName}
          onChange={(e) => setField("fullName", e.target.value)}
          autoComplete="off"
        />
        {errors.fullName && <p className="auth-error">{errors.fullName}</p>}

        <label htmlFor="upgrade-card">Card number</label>
        <input
          id="upgrade-card"
          type="text"
          inputMode="numeric"
          value={form.cardNumber}
          onChange={(e) => setField("cardNumber", formatCardNumber(e.target.value))}
          placeholder="1234 5678 9012 3456"
          autoComplete="off"
        />
        {errors.cardNumber && <p className="auth-error">{errors.cardNumber}</p>}

        <div className="upgrade-row">
          <div>
            <label htmlFor="upgrade-expiry">Expiry (MM/YY)</label>
            <input
              id="upgrade-expiry"
              type="text"
              inputMode="numeric"
              value={form.expiry}
              onChange={(e) => setField("expiry", formatExpiry(e.target.value))}
              placeholder="MM/YY"
              autoComplete="off"
            />
            {errors.expiry && <p className="auth-error">{errors.expiry}</p>}
          </div>
          <div>
            <label htmlFor="upgrade-cvv">CVV</label>
            <input
              id="upgrade-cvv"
              type="password"
              inputMode="numeric"
              value={form.cvv}
              onChange={(e) => setField("cvv", digitsOnly(e.target.value).slice(0, 4))}
              autoComplete="off"
            />
            {errors.cvv && <p className="auth-error">{errors.cvv}</p>}
          </div>
        </div>

        {submitError && <p className="auth-error" role="alert">{submitError}</p>}

        <div className="upgrade-actions">
          <button type="button" className="upgrade-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="upgrade-submit" disabled={submitting}>
            {submitting ? "Processing..." : `Pay ${price}`}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpgradePlanModal;