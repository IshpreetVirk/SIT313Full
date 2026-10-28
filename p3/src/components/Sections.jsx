import { useState } from "react";

export function Header() {
  return (
    <nav className="navbar">
      <a href="#about">About</a>
      <a href="#work">Work</a>
      <a href="#contact">Contact</a>
    </nav>
  );
}

export function Banner() {
  return (
    <div className="banner">
      <img src="/banner.jpg" alt="Banner" className="banner-image" />
      <div className="banner-greeting">Hey, I'm Ishpreet</div>
    </div>
  );
}

export function Profile() {
  return (
    <section className="profile">
      <img src="/profile.JPG" alt="Profile" className="profile-image" />
      <p className="profile-text">
        I am an independent developer focused on automation and AI tooling.
      </p>
      <hr className="divider" />
      <h2 className="section-heading">Here's what I've done so far</h2>
    </section>
  );
}

export function Portfolio() {
  return (
    <section className="portfolio">
      <div className="portfolio-item">
        <img src="/project1.jpg" alt="Arduino Project" />
        <div>
          <h3>Arduino Helper Machine</h3>
          <p>
            A small Arduino board project that builds a simple helpful
            machine using sensors and basic automation logic.
          </p>
        </div>
      </div>
      <div className="portfolio-item">
        <img src="/project2.png" alt="JS Calculator" />
        <div>
          <h3>JavaScript Calculator</h3>
          <p>
            A small calculator built with HTML, CSS and JavaScript that
            takes two numbers and computes the result.
          </p>
        </div>
      </div>
    </section>
  );
}

const galleryImages = [
  "/gallery1.png",
  "/gallery2.png",
  "/gallery3.png",
  "/gallery4.jpg",
  "/gallery5.jpg",
  "/gallery6.jpg",
  "/gallery7.jpg",
  "/gallery8.jpg",
  "/gallery9.jpg"
];

export function Gallery() {
  return (
    <section className="gallery-section">
      <hr className="divider" />
      <h2 className="section-heading">My photos</h2>
      <div className="gallery-grid">
        {galleryImages.map((src, index) => (
          <img key={index} src={src} alt="Gallery" className="gallery-image" />
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setMessage(data.message);
    } catch (err) {
      setMessage("Something went wrong");
    }
  };

  return (
    <footer className="footer">
      <div className="newsletter">
        <p className="newsletter-text">SIGN UP FOR OUR DAILY INSIDER</p>
        <form className="newsletter-form" onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Subscribe</button>
        </form>
      </div>
      {message && <p className="newsletter-message">{message}</p>}

      <div className="footer-columns">
        <div>
          <h4>Explore</h4>
          <a href="#home">Home</a>
          <a href="#questions">Questions</a>
          <a href="#articles">Articles</a>
          <a href="#tutorials">Tutorials</a>
        </div>
        <div>
          <h4>Support</h4>
          <a href="#faqs">FAQs</a>
          <a href="#help">Help</a>
          <a href="#contact">Contact Us</a>
        </div>
        <div>
          <h4>Stay connected</h4>
          <div className="social-icons">
            <span>📘</span>
            <span>🐦</span>
            <span>📷</span>
          </div>
        </div>
      </div>

      <p className="footer-copyright">DEV@Deakin 2026</p>
      <div className="footer-legal">
        <a href="#privacy">Privacy Policy</a>
        <a href="#terms">Terms</a>
        <a href="#conduct">Code of Conduct</a>
      </div>
    </footer>
  );
}