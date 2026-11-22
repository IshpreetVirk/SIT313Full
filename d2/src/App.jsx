import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PostPage from "./pages/PostPage";
import BrowsePostsPage from "./pages/BrowsePostsPage";
import Pricing from "./pages/Pricing";

const TOKEN_KEY = "devdeakin_token";

async function request(path, { method = "GET", body, token } = {}) {
  let response;

  try {
    response = await fetch(path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to reach the server. Please try again later.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    request("/api/me", { token })
      .then((data) => setUser(data.user))
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const register = (name, email, password) =>
    request("/api/register", { method: "POST", body: { name, email, password } });

  const login = async (email, password) => {
    const data = await request("/api/login", { method: "POST", body: { email, password } });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const upgradePlan = async (customerName) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!user || !token) {
      throw new Error("Please log in to upgrade your plan.");
    }

    try {
      const data = await request("/api/subscription/upgrade", {
        method: "POST",
        body: { customerName },
        token,
      });
      setUser((current) => (current ? { ...current, plan: data.plan } : current));
      return data;
    } catch (error) {
      if (error.status === 401) {
        logout();
      }
      if (error.status === 409) {
        setUser((current) => (current ? { ...current, plan: "paid" } : current));
      }
      throw error;
    }
  };

  const createPost = async (postPayload) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!user || !token) {
      throw new Error("You must be logged in to create a post.");
    }

    try {
      return await request("/api/posts", {
        method: "POST",
        body: postPayload,
        token,
      });
    } catch (error) {
      if (error.status === 401) {
        logout();
      }
      throw error;
    }
  };

  const fetchPosts = async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    try {
      return await request("/api/posts", {
        method: "GET",
        token: token || undefined,
      });
    } catch (error) {
      if (error.status === 401 && token) {
        logout();
        return await request("/api/posts", { method: "GET" });
      }
      throw error;
    }
  };

  const auth = {
    user,
    loading: authLoading,
    isLoggedIn: Boolean(user),
    isPaid: user ? user.plan === "paid" : false,
    register,
    login,
    logout,
    upgradePlan,
    createPost,
    fetchPosts,
  };

  return (
    <div className="app">
      <Navbar auth={auth} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login auth={auth} />} />
        <Route path="/signup" element={<Signup auth={auth} />} />
        <Route path="/post" element={<PostPage auth={auth} />} />
        <Route path="/browse-posts" element={<BrowsePostsPage auth={auth} />} />
        <Route path="/pricing" element={<Pricing auth={auth} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;