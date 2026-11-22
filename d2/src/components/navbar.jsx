import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar({ auth }) {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (trimmed) {
      navigate(`/browse-posts?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/browse-posts");
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-logo">
        DEV@Deakin
      </Link>

      <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          className="navbar-search"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>

      <nav className="navbar-links">
        <Link to="/" className="navbar-link">
          Home
        </Link>
        <Link to="/browse-posts" className="navbar-link">
          Browse Posts
        </Link>
        <Link to="/post" className="navbar-post">
          Post
        </Link>
        <Link to="/pricing" className="navbar-pricing">
          Plans
        </Link>

        {auth?.isLoggedIn ? (
          <div className="navbar-user">
            <span
              className={`plan-pill ${
                auth.isPaid ? "plan-pill-paid" : "plan-pill-free"
              }`}
            >
              {auth.isPaid ? "Paid" : "Free"}
            </span>
            <span className="navbar-user-email">
              {auth.user.firstName || auth.user.email}
            </span>
            <button
              type="button"
              className="navbar-logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="navbar-login">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}

export default Navbar;