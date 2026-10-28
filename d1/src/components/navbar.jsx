import { Link, useNavigate } from "react-router-dom";

function Navbar({ auth }) {
  const { isLoggedIn, loading, logout } = auth;
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate("/");
  };

  let authLink;
  if (loading) {
    authLink = (
      <span className="navbar-login" style={{ visibility: "hidden" }}>Login</span>
    );
  } else if (isLoggedIn) {
    authLink = (
      <Link to="/" className="navbar-login" onClick={handleLogout}>Logout</Link>
    );
  } else {
    authLink = <Link to="/login" className="navbar-login">Login</Link>;
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">DEV@Deakin</Link>
      <input type="text" className="navbar-search" placeholder="Search..." disabled />
      <div className="navbar-links">
        <Link to="/pricing" className="navbar-pricing">Pricing</Link>
        <Link to="/post" className="navbar-post">Post</Link>
        {authLink}
      </div>
    </nav>
  );
}

export default Navbar;