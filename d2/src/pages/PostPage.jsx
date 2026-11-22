import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./PostPage.css";

const MAX_TAGS = 3;

const initialValues = {
  title: "",
  description: "",
  abstract: "",
  articleText: "",
  tags: ""
};

const requiredFields = {
  question: [
    { name: "title", label: "Title", minLength: 3 },
    { name: "description", label: "Problem description", minLength: 5 }
  ],
  article: [
    { name: "title", label: "Title", minLength: 3 },
    { name: "abstract", label: "Abstract", minLength: 5 },
    { name: "articleText", label: "Article text", minLength: 10 }
  ]
};

function parseTags(tagsText) {
  return tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

function validate(postType, values) {
  const errors = {};

  requiredFields[postType].forEach((field) => {
    const trimmed = values[field.name].trim();
    if (trimmed === "") {
      errors[field.name] = `${field.label} is required.`;
    } else if (field.minLength && trimmed.length < field.minLength) {
      errors[field.name] = `${field.label} must be at least ${field.minLength} characters.`;
    }
  });

  const tagList = parseTags(values.tags);
  if (tagList.length === 0) {
    errors.tags = "Please add at least one tag.";
  } else if (tagList.length > MAX_TAGS) {
    errors.tags = `You can add a maximum of ${MAX_TAGS} tags.`;
  }

  return errors;
}

function FieldError({ id, message }) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} className="post-error" role="alert">
      {message}
    </p>
  );
}

function PostPage({ auth }) {
  const [postType, setPostType] = useState("question");
  const [postPlan, setPostPlan] = useState("free");
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [popup, setPopup] = useState(null);
  const closeButtonRef = useRef(null);

  const isQuestion = postType === "question";
  const tagCount = parseTags(values.tags).length;

  useEffect(() => {
    if (!popup) {
      return;
    }

    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setPopup(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [popup]);

  function handleTypeChange(event) {
    setPostType(event.target.value);
    setErrors({});
  }

  function handlePlanChange(event) {
    setPostPlan(event.target.value);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues({ ...values, [name]: value });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const newErrors = validate(postType, values);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setPopup({
        type: "error",
        title: "Post not sent",
        message:
          "Your post could not be sent. Please fix the highlighted fields and try again."
      });
      return;
    }

    if (!auth?.isLoggedIn) {
      setPopup({
        type: "error",
        title: "Authentication required",
        message: "You must be logged in to submit a post. Please log in and try again."
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        postType,
        postPlan,
        title: values.title.trim(),
        details: isQuestion ? values.description.trim() : "",
        description: isQuestion ? values.description.trim() : "",
        abstract: !isQuestion ? values.abstract.trim() : "",
        articleText: !isQuestion ? values.articleText.trim() : "",
        tags: parseTags(values.tags)
      };

      await auth.createPost(payload);

      setPopup({
        type: "success",
        title: "Post published",
        message: `Your ${postPlan} ${postType} "${values.title.trim()}" has been saved to Firestore.`
      });
      setValues(initialValues);
      setPostPlan("free");
      setErrors({});
    } catch (error) {
      setPopup({
        type: "error",
        title: "Post not sent",
        message: error.message || "Could not save your post. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  }

  function closePopup() {
    setPopup(null);
  }

  return (
    <main className="post-page">
      <h1 className="post-bar">New Post</h1>

      {!auth?.isLoggedIn ? (
        <div className="post-auth-banner post-auth-banner-warning">
          You are currently not logged in. Please <Link to="/login">log in</Link> before
          submitting a post.
        </div>
      ) : (
        <div className="post-auth-banner">
          Posting as <strong>{auth.user.email}</strong> (Current Plan:{" "}
          <strong>{auth.isPaid ? "Paid" : "Free"}</strong>)
        </div>
      )}

      <form className="post-form" onSubmit={handleSubmit} noValidate>
        <div className="post-type" role="radiogroup" aria-labelledby="post-type-label">
          <span id="post-type-label" className="post-type-label">
            Select Post Type:
          </span>
          <label className="post-radio">
            <input
              type="radio"
              name="postType"
              value="question"
              checked={isQuestion}
              onChange={handleTypeChange}
            />
            Question
          </label>
          <label className="post-radio">
            <input
              type="radio"
              name="postType"
              value="article"
              checked={!isQuestion}
              onChange={handleTypeChange}
            />
            Article
          </label>
        </div>

        <div className="post-type post-plan" role="radiogroup" aria-labelledby="post-plan-label">
          <span id="post-plan-label" className="post-type-label">
            Select Post Plan:
          </span>
          <label className="post-radio">
            <input
              type="radio"
              name="postPlan"
              value="free"
              checked={postPlan === "free"}
              onChange={handlePlanChange}
            />
            Free
          </label>
          <label className="post-radio">
            <input
              type="radio"
              name="postPlan"
              value="paid"
              checked={postPlan === "paid"}
              onChange={handlePlanChange}
            />
            Paid
          </label>
          {auth?.isLoggedIn && !auth.isPaid && postPlan === "paid" && (
            <span className="post-plan-note">
              Paid posts require a <Link to="/pricing">Paid subscription</Link>.
            </span>
          )}
        </div>

        <h2 className="post-bar">What do you want to ask or share</h2>
        <p className="post-intro">
          {isQuestion
            ? "Ask a question and describe your problem in as much detail as you can."
            : "Share an article with the community by adding a short abstract and the full text."}
        </p>

        <div className="post-field post-field-inline">
          <label htmlFor="post-title">Title</label>
          <div className="post-field-control">
            <input
              id="post-title"
              name="title"
              type="text"
              className="post-input"
              value={values.title}
              onChange={handleChange}
              placeholder={
                isQuestion
                  ? "Start your question with how, what, why, etc."
                  : "Enter a descriptive title"
              }
              required
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "post-title-error" : undefined}
            />
            <FieldError id="post-title-error" message={errors.title} />
          </div>
        </div>

        {isQuestion ? (
          <div className="post-field">
            <label htmlFor="post-description">Describe your problem</label>
            <textarea
              id="post-description"
              name="description"
              className="post-textarea post-textarea-large"
              value={values.description}
              onChange={handleChange}
              required
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "post-description-error" : undefined}
            />
            <FieldError id="post-description-error" message={errors.description} />
          </div>
        ) : (
          <>
            <div className="post-field">
              <label htmlFor="post-abstract">Abstract</label>
              <textarea
                id="post-abstract"
                name="abstract"
                className="post-textarea post-textarea-abstract"
                value={values.abstract}
                onChange={handleChange}
                placeholder="Enter a 1-paragraph abstract"
                required
                aria-invalid={Boolean(errors.abstract)}
                aria-describedby={errors.abstract ? "post-abstract-error" : undefined}
              />
              <FieldError id="post-abstract-error" message={errors.abstract} />
            </div>

            <div className="post-field">
              <label htmlFor="post-article-text">Article Text</label>
              <textarea
                id="post-article-text"
                name="articleText"
                className="post-textarea post-textarea-article"
                value={values.articleText}
                onChange={handleChange}
                placeholder="Write your article here"
                required
                aria-invalid={Boolean(errors.articleText)}
                aria-describedby={errors.articleText ? "post-article-text-error" : undefined}
              />
              <FieldError id="post-article-text-error" message={errors.articleText} />
            </div>
          </>
        )}

        <div className="post-field post-field-inline">
          <label htmlFor="post-tags">Tags</label>
          <div className="post-field-control">
            <input
              id="post-tags"
              name="tags"
              type="text"
              className="post-input"
              value={values.tags}
              onChange={handleChange}
              placeholder={`Please add up to ${MAX_TAGS} tags to describe what your ${postType} is about e.g., Java`}
              required
              aria-invalid={Boolean(errors.tags)}
              aria-describedby={errors.tags ? "post-tags-hint post-tags-error" : "post-tags-hint"}
            />
            <p id="post-tags-hint" className="post-hint">
              Separate tags with commas ({tagCount}/{MAX_TAGS} used)
            </p>
            <FieldError id="post-tags-error" message={errors.tags} />
          </div>
        </div>

        <div className="post-actions">
          <button type="submit" className="post-button" disabled={submitting}>
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>

      {popup && (
        <div className="post-popup-overlay" onClick={closePopup}>
          <div
            className={`post-popup post-popup-${popup.type}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-popup-title"
            aria-describedby="post-popup-message"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="post-popup-title" className="post-popup-title">
              {popup.title}
            </h3>
            <p id="post-popup-message" className="post-popup-message">
              {popup.message}
            </p>
            <button
              type="button"
              className="post-button post-popup-button"
              ref={closeButtonRef}
              onClick={closePopup}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default PostPage;