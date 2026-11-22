import { useState } from "react";
import { Link } from "react-router-dom";
import UpgradePlanModal from "../components/UpgradePlanModal";

const PAID_PRICE = "$9.99";

const features = [
  { label: "Read free posts", free: true, paid: true },
  { label: "Read premium posts", free: false, paid: true },
  { label: "Posts per month", free: "5", paid: "Unlimited" },
  { label: "Image upload size", free: "2 MB", paid: "25 MB" },
  { label: "Post analytics", free: false, paid: true },
  { label: "Priority support", free: false, paid: true },
];

function FeatureValue({ value }) {
  if (value === true) return <span aria-label="Included">✓</span>;
  if (value === false) return <span aria-label="Not included">—</span>;
  return <span>{value}</span>;
}

function Pricing({ auth }) {
  const { user, isLoggedIn, isPaid, loading, upgradePlan } = auth;
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState(null);

  const handleUpgradeClick = () => {
    if (loading || isPaid) return;

    if (!isLoggedIn) {
      setNotice("login");
      return;
    }

    setNotice(null);
    setShowModal(true);
  };

  const handleUpgraded = () => {
    setShowModal(false);
    setNotice("success");
  };

  let statusText = "Log in to see your current plan.";
  if (loading) statusText = "Checking your plan...";
  else if (isLoggedIn) statusText = `${user.firstName}, you are on the ${isPaid ? "Paid" : "Free"} plan.`;

  return (
    <section className="pricing-page">
      <h1>Choose your plan</h1>
      <p className="pricing-status">{statusText}</p>

      {notice === "login" && (
        <p className="pricing-notice pricing-notice-error" role="alert">
          Please <Link to="/login">log in</Link> to upgrade your plan.
        </p>
      )}
      {notice === "success" && (
        <p className="pricing-notice pricing-notice-success" role="status">
          Payment successful. You are now on the Paid plan.
        </p>
      )}

      <div className="pricing-cards">
        <article className="plan-card">
          <div className="plan-badges">
            <span className="plan-badge">Default plan</span>
            {!loading && isLoggedIn && !isPaid && (
              <span className="plan-badge plan-badge-current">Your plan</span>
            )}
          </div>
          <h2>Free</h2>
          <p className="plan-price">$0 <span>/ month</span></p>
          <ul className="plan-features">
            {features.map((feature) => (
              <li key={feature.label}>
                <span>{feature.label}</span>
                <FeatureValue value={feature.free} />
              </li>
            ))}
          </ul>
        </article>

        <article className="plan-card plan-card-paid">
          <div className="plan-badges">
            {!loading && isPaid && (
              <span className="plan-badge plan-badge-current">Your plan: Paid</span>
            )}
          </div>
          <h2>Paid</h2>
          <p className="plan-price">{PAID_PRICE} <span>/ month</span></p>
          <ul className="plan-features">
            {features.map((feature) => (
              <li key={feature.label}>
                <span>{feature.label}</span>
                <FeatureValue value={feature.paid} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="plan-button"
            onClick={handleUpgradeClick}
            disabled={loading || isPaid}
          >
            {loading ? "Loading..." : isPaid ? "You are on the Paid plan" : "Upgrade Plan"}
          </button>
          {isPaid && <p className="plan-note">You are already on the Paid plan.</p>}
        </article>
      </div>

      {showModal && isLoggedIn && !isPaid && (
        <UpgradePlanModal
          price={PAID_PRICE}
          upgradePlan={upgradePlan}
          onClose={() => setShowModal(false)}
          onSuccess={handleUpgraded}
        />
      )}
    </section>
  );
}

export default Pricing;