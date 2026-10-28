import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">DEV@Deakin</Link>
      <input type="text" className="navbar-search" placeholder="Search..." disabled />
      <div className="navbar-links">
        <span className="navbar-post">Post</span>
        <Link to="/login" className="navbar-login">Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;