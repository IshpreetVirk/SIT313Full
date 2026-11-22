import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

function formatDate(value) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputString(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviewText(post) {
  const source =
    post.postType === "article"
      ? post.abstract || post.articleText || ""
      : post.details || "";
  if (source.length <= 180) return source;
  return `${source.slice(0, 180).trim()}...`;
}

function BrowsePostsPage({ auth }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [posts, setPosts] = useState([]);
  const [effectivePlan, setEffectivePlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  const [expandedPostIds, setExpandedPostIds] = useState([]);

  useEffect(() => {
    const queryParam = searchParams.get("q") || "";
    setSearchQuery(queryParam);
  }, [searchParams]);

  useEffect(() => {
    if (auth.loading) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    auth
      .fetchPosts()
      .then((data) => {
        if (cancelled) return;
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setEffectivePlan(data.plan || (auth.isPaid ? "paid" : "free"));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Could not load posts.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth.loading, auth.user?.email, auth.user?.plan]);

  const availableTags = useMemo(() => {
    const tagSet = new Set();
    posts.forEach((post) => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          const normalized = String(tag).trim().toLowerCase();
          if (normalized) tagSet.add(normalized);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  const visiblePosts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const normalizedTag = tagFilter.trim().toLowerCase();

    return posts.filter((post) => {
      if (hiddenPostIds.includes(post.id)) {
        return false;
      }

      if (typeFilter !== "all" && post.postType !== typeFilter) {
        return false;
      }

      if (planFilter !== "all" && post.postPlan !== planFilter) {
        return false;
      }

      if (normalizedTag) {
        const postTags = Array.isArray(post.tags)
          ? post.tags.map((t) => String(t).trim().toLowerCase())
          : [];
        const matchesTag = postTags.some((t) => t.includes(normalizedTag));
        if (!matchesTag) {
          return false;
        }
      }

      if (dateFrom || dateTo) {
        const postDateStr = toDateInputString(post.createdAt);
        if (!postDateStr) return false;
        if (dateFrom && postDateStr < dateFrom) return false;
        if (dateTo && postDateStr > dateTo) return false;
      }

      if (normalizedSearch) {
        const haystacks = [
          post.title || "",
          post.details || "",
          post.abstract || "",
          post.articleText || "",
          post.authorName || "",
          ...(Array.isArray(post.tags) ? post.tags : []),
        ]
          .join(" ")
          .toLowerCase();

        if (!haystacks.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [posts, hiddenPostIds, typeFilter, planFilter, tagFilter, dateFrom, dateTo, searchQuery]);

  const handleHidePost = (postId) => {
    setHiddenPostIds((current) =>
      current.includes(postId) ? current : [...current, postId]
    );
  };

  const handleToggleExpand = (postId) => {
    setExpandedPostIds((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId]
    );
  };

  const handleReset = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setPlanFilter("all");
    setTagFilter("");
    setDateFrom("");
    setDateTo("");
    setHiddenPostIds([]);
    setExpandedPostIds([]);
    if (searchParams.has("q")) {
      setSearchParams({});
    }
  };

  const hasActiveFiltersOrHidden =
    Boolean(searchQuery.trim()) ||
    typeFilter !== "all" ||
    planFilter !== "all" ||
    Boolean(tagFilter.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    hiddenPostIds.length > 0;

  return (
    <main className="browse-page">
      <div className="browse-header">
        <div>
          <h1 className="browse-title">Browse Posts</h1>
          <p className="browse-subtitle">
            Explore community questions and articles stored on DEV@Deakin.
          </p>
        </div>
        <div className="browse-header-actions">
          <Link to="/post" className="browse-create-button">
            Create New Post
          </Link>
        </div>
      </div>

      <div className="browse-access-banner">
        {!auth.isLoggedIn && (
          <p>
            Viewing as <strong>Visitor</strong>: showing <strong>Free</strong> posts only.{" "}
            <Link to="/login">Log in</Link> or <Link to="/pricing">upgrade to Paid</Link> to
            access Paid posts.
          </p>
        )}
        {auth.isLoggedIn && effectivePlan !== "paid" && (
          <p>
            Logged in as <strong>{auth.user.email}</strong> on the{" "}
            <span className="plan-pill plan-pill-free">Free Plan</span>: showing{" "}
            <strong>Free</strong> posts only.{" "}
            <Link to="/pricing">Upgrade to the Paid plan</Link> to unlock Paid questions and
            articles.
          </p>
        )}
        {auth.isLoggedIn && effectivePlan === "paid" && (
          <p>
            Logged in as <strong>{auth.user.email}</strong> on the{" "}
            <span className="plan-pill plan-pill-paid">Paid Plan</span>: showing both{" "}
            <strong>Free and Paid</strong> posts.
          </p>
        )}
      </div>

      <section className="browse-filters" aria-label="Post Filters">
        <div className="browse-filter-grid">
          <div className="browse-filter-group browse-filter-search">
            <label htmlFor="filter-search">Search Title or Content</label>
            <input
              id="filter-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, abstracts, details, or tags..."
            />
          </div>

          <div className="browse-filter-group">
            <label htmlFor="filter-type">Post Type</label>
            <select
              id="filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="question">Question</option>
              <option value="article">Article</option>
            </select>
          </div>

          <div className="browse-filter-group">
            <label htmlFor="filter-plan">Post Plan</label>
            <select
              id="filter-plan"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all">All Accessible Plans</option>
              <option value="free">Free</option>
              {effectivePlan === "paid" && <option value="paid">Paid</option>}
            </select>
          </div>

          <div className="browse-filter-group">
            <label htmlFor="filter-tag">Tag</label>
            <input
              id="filter-tag"
              type="text"
              list="browse-tag-options"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="e.g. react, java"
            />
            <datalist id="browse-tag-options">
              {availableTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>

          <div className="browse-filter-group">
            <label htmlFor="filter-date-from">From Date</label>
            <input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="browse-filter-group">
            <label htmlFor="filter-date-to">To Date</label>
            <input
              id="filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="browse-filter-footer">
          <p className="browse-count">
            Showing <strong>{visiblePosts.length}</strong> of <strong>{posts.length}</strong>{" "}
            accessible posts
            {hiddenPostIds.length > 0 && ` (${hiddenPostIds.length} hidden)`}
          </p>
          <button
            type="button"
            className="browse-reset-button"
            onClick={handleReset}
            disabled={!hasActiveFiltersOrHidden}
          >
            Reset Filters & Hidden Posts
          </button>
        </div>
      </section>

      {loading && <div className="browse-state">Loading posts...</div>}

      {!loading && error && (
        <div className="browse-state browse-state-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && visiblePosts.length === 0 && (
        <div className="browse-state">
          <p>No posts match the current view.</p>
          {hasActiveFiltersOrHidden && (
            <button type="button" className="browse-reset-button" onClick={handleReset}>
              Reset View
            </button>
          )}
        </div>
      )}

      {!loading && !error && visiblePosts.length > 0 && (
        <div className="browse-post-list">
          {visiblePosts.map((post) => {
            const isExpanded = expandedPostIds.includes(post.id);

            return (
              <article
                key={post.id}
                className={`browse-post-card ${
                  post.postPlan === "paid" ? "browse-post-card-paid" : ""
                }`}
              >
                <div className="browse-post-top">
                  <div className="browse-post-badges">
                    <span
                      className={`post-badge ${
                        post.postType === "article"
                          ? "post-badge-article"
                          : "post-badge-question"
                      }`}
                    >
                      {post.postType === "article" ? "Article" : "Question"}
                    </span>
                    <span
                      className={`post-badge ${
                        post.postPlan === "paid" ? "post-badge-paid" : "post-badge-free"
                      }`}
                    >
                      {post.postPlan === "paid" ? "Paid" : "Free"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="browse-hide-button"
                    onClick={() => handleHidePost(post.id)}
                  >
                    Hide
                  </button>
                </div>

                <h2
                  className="browse-post-title"
                  onClick={() => handleToggleExpand(post.id)}
                >
                  {post.title}
                </h2>

                <div className="browse-post-meta">
                  <span>By {post.authorName || post.userId}</span>
                  <span>•</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>

                {!isExpanded ? (
                  <p className="browse-post-preview">{getPreviewText(post)}</p>
                ) : (
                  <div className="browse-post-expanded">
                    {post.postType === "article" ? (
                      <>
                        <div className="browse-post-section">
                          <h3>Abstract</h3>
                          <p>{post.abstract}</p>
                        </div>
                        <div className="browse-post-section">
                          <h3>Article Text</h3>
                          <p>{post.articleText}</p>
                        </div>
                      </>
                    ) : (
                      <div className="browse-post-section">
                        <h3>Question Details</h3>
                        <p>{post.details}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="browse-post-bottom">
                  <div className="browse-post-tags">
                    {Array.isArray(post.tags) &&
                      post.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="browse-tag-chip"
                          onClick={() => setTagFilter(tag)}
                        >
                          #{tag}
                        </button>
                      ))}
                  </div>

                  <button
                    type="button"
                    className="browse-expand-button"
                    onClick={() => handleToggleExpand(post.id)}
                  >
                    {isExpanded ? "Show Less" : "Read More"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default BrowsePostsPage;