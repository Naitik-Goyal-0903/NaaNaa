import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from "react";
import { addProductReview, deleteProductReview, getProductReviews, getWishlist, toggleWishlistItem } from "./utils/api";

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: 9,
    name: "Storm Rain Jacket",
    brand: "Apex",
    category: "Women's",
    price: 219.99,
    originalPrice: 279.99,
    rating: 4.9,
    reviews: 723,
    image: "https://picsum.photos/seed/storm-jacket-main/700/900",
    images: [
      "https://picsum.photos/seed/storm-jacket-main/700/900",
      "https://picsum.photos/seed/storm-jacket-side/700/900",
      "https://picsum.photos/seed/storm-jacket-back/700/900"
    ],
    badge: "Top Rated",
    tags: ["apparel", "outdoor", "sport"],
    description: "Gore-Tex Pro membrane with sealed seams. Adjustable hood, pit zips for ventilation, and YKK� zippers throughout.",
    specs: { Material: "Gore-Tex Pro", Zippers: "YKK�", Sizes: "XS-3XL", Weight: "420g" },
    colors: ["#1a3c5e", "#0a0a0a", "#4a7c59"]
  },
];

const CATEGORIES = ["All", "Women's", "Men's", "Accessories"];
const TEMPLATE_TARGET_CATEGORIES = ["All", "Women's", "Men's", "Accessories"];

const HERO_TEMPLATES = [
  { id: 1, badge: "New Collection 2025", title: "Curated for the<br /><span style={{ color: '#e8c87a' }}>Discerning</span>", subtitle: "Timeless pieces, modern sensibility.", buttonText: "Explore Collection ?", background: "linear-gradient(135deg, #e8f4f8 0%, #d1e7f0 50%, #b8d8e6 100%)", overlay: "radial-gradient(circle at 30% 50%, #e8c87a 0%, transparent 50%)" },
];

const MAX_TEMPLATE_MEDIA_BYTES = 12 * 1024 * 1024;
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

// ─── UTILITY ─────────────────────────────────────────────────────────────────
const StarRating = ({ rating, max = 5, size = 14 }) => (
  <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
    {Array.from({ length: max }, (_, i) => {
      const fill = i < Math.floor(rating) ? 1 : i < rating ? rating - Math.floor(rating) : 0;
      return (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <defs><linearGradient id={`star-${i}-${rating}`}><stop offset={`${fill * 100}%`} stopColor="#f59e0b" /><stop offset={`${fill * 100}%`} stopColor="#e2e8f0" /></linearGradient></defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" fill={`url(#star-${i}-${rating})`} stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    })}
  </div>
);

const formatPrice = (p) => `$${p.toFixed(2)}`;
const discount = (orig, cur) => orig ? Math.round((1 - cur / orig) * 100) : null;
const normalizeCategory = (value) => {
  const raw = String(value || "").trim();
  const v = raw.toLowerCase();

  if (!v) return "Women's";
  if (v === "women's" || v === "womens" || v === "women" || v === "woman") return "Women's";
  if (v === "men's" || v === "mens" || v === "men" || v === "man") return "Men's";
  if (v === "accessories" || v === "accessory") return "Accessories";

  if (v.includes("accessory")) return "Accessories";
  if (v.includes("women") || v.includes("lady") || v.includes("girl") || v.includes("kurti") || v.includes("saree") || v.includes("dress")) return "Women's";
  if (v.includes("men") || v.includes("boy")) return "Men's";

  return "Women's";
};

const normalizeTemplateCategory = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "All";
  if (raw.toLowerCase() === "all") return "All";
  return normalizeCategory(raw);
};

const looksLikeMediaPath = (value = "") => {
  const v = String(value || "").trim();
  if (!v) return false;
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("/") ||
    v.startsWith("uploads/") ||
    v.startsWith("data:image/") ||
    v.startsWith("data:video/") ||
    /\.(jpg|jpeg|png|gif|webp|svg|avif|mp4|webm|ogg|mov)(\?.*)?$/i.test(v)
  );
};

const pickMediaValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const candidate = value.url || value.src || value.image || value.path || "";
    return typeof candidate === "string" ? candidate.trim() : "";
  }
  return "";
};

const mapApiProductToUi = (p = {}) => {
  const apiImages = Array.isArray(p.images)
    ? p.images.map(pickMediaValue).filter(Boolean)
    : [];
  const primaryImage = pickMediaValue(p.image);
  const normalizedImages = [...new Set([...apiImages, ...(primaryImage ? [primaryImage] : [])])];
  const validImages = normalizedImages.filter(looksLikeMediaPath);
  const finalImages = validImages.length ? validImages : (normalizedImages.length ? normalizedImages : []);

  return {
    _id: p._id || p.id || Date.now(),
    id: p._id || p.id || Date.now(),
    name: p.name || "Untitled Product",
    brand: p.brand || p.category || "Generic",
    category: normalizeCategory(p.category),
    price: Number(p.price) || 0,
    originalPrice: Number(p.originalPrice) || Number(p.price) || 0,
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews) || 0,
    image: finalImages[0] || "???",
    images: finalImages,
    badge: "Limited Stock",
    tags: Array.isArray(p.tags) && p.tags.length ? p.tags : [String(p.category || "").toLowerCase()],
    description: p.description || "",
    stock: Number(p.stock) || 0,
    sizes: normalizeCategory(p.category) === "Accessories" ? [] : (Array.isArray(p.sizes) ? p.sizes : []),
    reviewList: Array.isArray(p.reviewList) ? p.reviewList : []
  };
};

const normalizeId = (value) => String(value || "").trim();

const isProductInWishlist = (wishlist = [], product) => {
  const productId = normalizeId(product?._id || product?.id);
  return wishlist.some((wishItem) => {
    if (typeof wishItem === "string") return normalizeId(wishItem) === productId;
    if (wishItem && typeof wishItem === "object") {
      return normalizeId(wishItem._id || wishItem.id || wishItem.productId) === productId;
    }
    return false;
  });
};

const isImageValue = (value) => (
  typeof value === "string" &&
  (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("uploads/") ||
    /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(value)
  )
);

const isVideoValue = (value) => (
  typeof value === "string" &&
  (
    value.startsWith("data:video/") ||
    value.startsWith("/uploads/") ||
    value.startsWith("uploads/") ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(value)
  )
);

const resolveMediaSrc = (value) => {
  if (typeof value !== "string") return value;
  const normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith("uploads/")) return `${API_ORIGIN}/${normalized}`;
  if (normalized.startsWith("/uploads/")) return `${API_ORIGIN}${normalized}`;
  return normalized;
};

const renderProductMedia = (imageValue, size = 64) => {
  if (isVideoValue(imageValue)) {
    return (
      <video
        src={resolveMediaSrc(imageValue)}
        muted
        playsInline
        loop
        autoPlay
        style={{ width: size, height: size, objectFit: "cover", borderRadius: 10 }}
      />
    );
  }
  if (isImageValue(imageValue)) {
    return (
      <img
        src={resolveMediaSrc(imageValue)}
        alt="product"
        onError={(e) => {
          const fallback = `https://picsum.photos/seed/${encodeURIComponent(String(imageValue || "naanaa-media"))}/700/900`;
          if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
        }}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: 10 }}
      />
    );
  }
  return <span style={{ fontSize: Math.round(size * 0.45) }}>{imageValue || "???"}</span>;
};

const normalizeTemplate = (tpl = {}, index = 0) => ({
  _id: tpl._id || tpl.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  id: tpl._id || tpl.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  badge: "",
  title: "",
  subtitle: "",
  buttonText: "Explore Collection",
  targetCategory: normalizeTemplateCategory(tpl.targetCategory),
  background: tpl.background || "linear-gradient(135deg, #e8f4f8 0%, #d1e7f0 50%, #b8d8e6 100%)",
  overlay: tpl.overlay || "radial-gradient(circle at 30% 50%, rgba(232,200,122,.35) 0%, transparent 55%)",
  mediaUrl: tpl.mediaUrl || "",
  mediaType: tpl.mediaType || ""
});

const normalizeTemplateList = (templates = []) => (
  Array.isArray(templates)
    ? templates.map((tpl, index) => normalizeTemplate(tpl, index))
    : []
);

// ─── TOAST ───────────────────────────────────────────────────────────────────
const Toast = ({ show, message, onClose }) => {
  useEffect(() => { if (show) { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); } }, [show]);
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: show ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(120px)", transition: "transform .35s cubic-bezier(.34,1.56,.64,1)", zIndex: 9999, background: "#4a90e2", color: "#fff", padding: "14px 28px", borderRadius: 12, boxShadow: "0 8px 30px rgba(74,144,226,.3)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none", fontFamily: "'Playfair Display', serif" }}>
      {message}
    </div>
  );
};

// ─── VALIDATION FUNCTIONS ────────────────────────────────────────────────────
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@])[A-Za-z\d@]{8,}$/;
  return passwordRegex.test(password);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SIGNUP PAGE (DEFINED OUTSIDE APP - FIXES REMOUNTING ISSUE) ──────────────
// ═══════════════════════════════════════════════════════════════════════════════
const SignupPage = React.memo(({ T, styles, navigate, signupUser, showToast, darkMode }) => {
  const [formData, setFormData] = useState({ username: "", mobile: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username required";
    if (formData.username.trim() && formData.username.trim().length < 3) newErrors.username = "Username must be at least 3 characters";
    if (!formData.mobile.trim()) newErrors.mobile = "Mobile required";
    if (!validatePhone(formData.mobile)) newErrors.mobile = "Must be 10 digits";
    if (!formData.email.trim()) newErrors.email = "Email required";
    if (!validateEmail(formData.email)) newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password required";
    if (!validatePassword(formData.password)) newErrors.password = "Password: uppercase, lowercase, number, @, 8+ chars";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);
    await signupUser(formData.username, formData.mobile, formData.email, formData.password);
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: "40px 24px" }}>
      <h1 style={{ ...styles.sectionTitle, textAlign: "center", fontSize: 28 }}>Create Account</h1>
      <p style={{ ...styles.sectionSub, textAlign: "center" }}>Join us today</p>
      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <input style={{ ...styles.input, borderColor: errors.username ? "#e85050" : styles.input.borderColor }} placeholder="Username" name="username" value={formData.username} onChange={handleChange} />
          {errors.username && <span style={{ color: "#e85050", fontSize: 12, marginTop: 4, display: "block" }}>{errors.username}</span>}
        </div>
        <div>
          <input style={{ ...styles.input, borderColor: errors.mobile ? "#e85050" : styles.input.borderColor }} placeholder="Mobile (10 digits)" name="mobile" value={formData.mobile} onChange={handleChange} />
          {errors.mobile && <span style={{ color: "#e85050", fontSize: 12, marginTop: 4, display: "block" }}>{errors.mobile}</span>}
        </div>
        <div>
          <input style={{ ...styles.input, borderColor: errors.email ? "#e85050" : styles.input.borderColor }} placeholder="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
          {errors.email && <span style={{ color: "#e85050", fontSize: 12, marginTop: 4, display: "block" }}>{errors.email}</span>}
        </div>
        <div>
          <div style={{ position: "relative" }}>
            <input style={{ ...styles.input, borderColor: errors.password ? "#e85050" : styles.input.borderColor }} placeholder="Password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.text, cursor: "pointer", fontSize: 16 }}>{showPassword ? "??" : "???"}</button>
          </div>
          {errors.password && <span style={{ color: "#e85050", fontSize: 12, marginTop: 4, display: "block" }}>{errors.password}</span>}
        </div>
        <div>
          <input style={{ ...styles.input, borderColor: errors.confirmPassword ? "#e85050" : styles.input.borderColor }} placeholder="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} />
          {errors.confirmPassword && <span style={{ color: "#e85050", fontSize: 12, marginTop: 4, display: "block" }}>{errors.confirmPassword}</span>}
        </div>
        <button type="submit" disabled={isLoading} style={{ ...styles.btn(true), width: "100%", justifyContent: "center", opacity: isLoading ? 0.6 : 1 }}>{isLoading ? "Creating..." : "Sign Up"}</button>
      </form>
      <p style={{ textAlign: "center", color: T.muted, fontSize: 13, marginTop: 20 }}>Already have an account? <span onClick={() => navigate("login")} style={{ color: T.accent, cursor: "pointer", fontWeight: 600 }}>Login</span></p>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LOGIN PAGE (DEFINED OUTSIDE APP - FIXES REMOUNTING ISSUE) ────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const LoginPage = React.memo(({ T, styles, navigate, loginUser, darkMode, validateEmail, validatePhone }) => {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.identifier.trim()) newErrors.identifier = "Email or mobile required";
    const id = formData.identifier.trim();
    if (id && !(validateEmail(id) || validatePhone(id))) newErrors.identifier = "Enter valid email or 10-digit mobile";
    if (!formData.password) newErrors.password = "Password required";
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleLogin = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);
    await loginUser(formData.identifier, formData.password);
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "40px 24px" }}>
      <h1 style={{ ...styles.sectionTitle, textAlign: "center", fontSize: 28 }}>Welcome Back</h1>
      <p style={{ ...styles.sectionSub, textAlign: "center" }}>Login to your account</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <input style={{ ...styles.input, borderColor: errors.identifier ? "#e85050" : styles.input.borderColor }} placeholder="Email or Mobile" name="identifier" value={formData.identifier} onChange={handleChange} onKeyPress={handleKeyPress} />
          {errors.identifier && <span style={{ color: "#e85050", fontSize: 12, marginTop: 4, display: "block" }}>{errors.identifier}</span>}
        </div>
        <div>
          <div style={{ position: "relative" }}>
            <input style={{ ...styles.input, borderColor: errors.password ? "#e85050" : styles.input.borderColor }} placeholder="Password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} onKeyPress={handleKeyPress} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.text, cursor: "pointer", fontSize: 16 }}>{showPassword ? "??" : "???"}</button>
          </div>
          {errors.password && <span style={{ color: "#e85050", fontSize: 12, marginTop: 4, display: "block" }}>{errors.password}</span>}
        </div>
        <button type="button" onClick={handleLogin} disabled={isLoading} style={{ ...styles.btn(true), width: "100%", justifyContent: "center", opacity: isLoading ? 0.6 : 1 }}>{isLoading ? "Logging in..." : "Login"}</button>
      </div>
      <p style={{ textAlign: "center", color: T.muted, fontSize: 13, marginTop: 20 }}>Don't have an account? <span onClick={() => navigate("signup")} style={{ color: T.accent, cursor: "pointer", fontWeight: 600 }}>Sign Up</span></p>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PROFILE PAGE (DEFINED OUTSIDE APP - FIXES REMOUNTING ISSUE) ──────────────
// ═══════════════════════════════════════════════════════════════════════════════
const ProfilePage = React.memo(({ T, styles, navigate, user, setUser, logoutUser, darkMode, showToast, products = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(user || {});
  const [userOrders, setUserOrders] = useState([]);
  const [activeReviewKey, setActiveReviewKey] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewSubmittingKey, setReviewSubmittingKey] = useState("");

  useEffect(() => {
    const loadUserOrders = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/my-orders`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("authToken")}` }
        });
        if (res.ok) {
          const orders = await res.json();
          setUserOrders(orders);
        } else {
          setUserOrders([]);
        }
      } catch (e) {
        setUserOrders([]);
      }
    };
    if (user) loadUserOrders();
  }, [user]);

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });
      if (res.ok) {
        setUserOrders(prev => prev.filter(order => order._id !== orderId));
      } else {
        window.alert("Failed to cancel order");
      }
    } catch (e) {
      window.alert("Failed to cancel order");
    }
  };

  const getDeliveryDate = (orderDate) => {
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    return deliveryDate.toLocaleDateString();
  };

  const getStatusColor = (status = "") => {
    switch (status.toLowerCase()) {
      case "processing": return "#f59e0b";
      case "shipped": return "#10b981";
      case "delivered": return "#3b82f6";
      default: return T.muted;
    }
  };

  const handleTrackOrder = (order) => {
    const status = (order.status || "processing").toLowerCase();
    const timeline = {
      pending: "Order received and waiting for confirmation",
      processing: "Packed at warehouse, pickup in progress",
      shipped: "In transit with courier partner",
      delivered: "Delivered to your address",
      cancelled: "Order cancelled"
    };
    const eta = getDeliveryDate(order.createdAt);
    showToast(`?? ${timeline[status] || "Tracking updated"} | ETA: ${eta}`);
  };

  const sendEnquiry = (order, item) => {
    const adminNumber = '918869821170';
    const itemQty = item.quantity || item.qty || 1;
    const message = `Hello Team,\n\nI need support regarding my order.\n\nCustomer Name: ${user?.name || user?.username || 'N/A'}\nCustomer Username: ${user?.username || 'N/A'}\nCustomer Email: ${user?.email || 'N/A'}\nCustomer Mobile: ${user?.mobile || order.mobile || 'N/A'}\n\nOrder ID: #${String(order._id || '').slice(-6).toUpperCase()}\nOrder Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}\nProduct: ${item.name}\nQuantity: ${itemQty}\nCurrent Status: ${String(order.status || 'pending').toUpperCase()}\nShipping Address: ${order.address || 'N/A'}\n\nPlease assist me with this query:\n`;
    const url = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const getDraft = (orderId, productId) => {
    const key = `${orderId}-${productId}`;
    return reviewDrafts[key] || { rating: 5, comment: "" };
  };

  const updateDraft = (orderId, productId, partial) => {
    const key = `${orderId}-${productId}`;
    setReviewDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { rating: 5, comment: "" }), ...partial }
    }));
  };

  const submitOrderItemReview = async (orderId, item) => {
    const productId = item.productId || item._id || item.id;
    if (!productId) {
      showToast("Error: Product ID not found for this item");
      return;
    }

    const key = `${orderId}-${productId}`;
    const draft = getDraft(orderId, productId);
    if (!draft.comment.trim()) {
      showToast("Error: Please write review comment");
      return;
    }

    setReviewSubmittingKey(key);
    try {
      await addProductReview(productId, {
        rating: draft.rating,
        comment: draft.comment.trim()
      });
      showToast("Success: Review submitted successfully");
      setReviewDrafts((prev) => ({ ...prev, [key]: { rating: 5, comment: "" } }));
      setActiveReviewKey("");
    } catch (error) {
      showToast(`Error: ${error.msg || error.message || "Review submit failed"}`);
    } finally {
      setReviewSubmittingKey("");
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "60px auto", padding: "40px 24px" }}>
      <h1 style={{ ...styles.sectionTitle, fontSize: 28 }}>My Profile</h1>

      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 28, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: T.accent }}>{user?.name || user?.username || "User"}</h2>
            <p style={{ margin: "4px 0 0", color: T.muted, fontSize: 14 }}>
              {user?.role === "admin" || user?.email === "admin@naananaa.local" ? "Administrator" : "Customer"}
            </p>
          </div>
          <button style={{ ...styles.btn(false), padding: "8px 16px", fontSize: 12 }} onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>

        {isEditing ? (
          <div style={{ background: T.input, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Edit Profile</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <input style={styles.input} placeholder="Username" value={editData.username || ""} onChange={e => setEditData(prev => ({ ...prev, username: e.target.value }))} />
              <input style={styles.input} placeholder="Name" value={editData.name || ""} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} />
              <input style={styles.input} placeholder="Mobile" value={editData.mobile || ""} onChange={e => setEditData(prev => ({ ...prev, mobile: e.target.value }))} />
              <input style={styles.input} placeholder="Email" value={editData.email || ""} onChange={e => setEditData(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button style={{ ...styles.btn(true), flex: 1, justifyContent: "center" }} onClick={() => { setUser(editData); setIsEditing(false); }}>Save Changes</button>
              <button style={{ ...styles.btn(false), flex: 1, justifyContent: "center" }} onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            <div style={{ padding: 16, background: T.input, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Username</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.username || "-"}</div>
            </div>
            <div style={{ padding: 16, background: T.input, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Email</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.email || "-"}</div>
            </div>
            <div style={{ padding: 16, background: T.input, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Mobile</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.mobile || "-"}</div>
            </div>
            <div style={{ padding: 16, background: T.input, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Member Since</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</div>
            </div>
          </div>
        )}

        <button style={{ ...styles.btn(false), width: "100%", justifyContent: "center", marginTop: 24 }} onClick={logoutUser}>Logout</button>
      </div>

      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 28, marginTop: 24 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>My Orders</h2>
        {userOrders.length === 0 ? (
          <div style={{ textAlign: "center", color: T.muted, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>??</div>
            <div>No orders yet</div>
            <button style={{ ...styles.btn(true), marginTop: 16 }} onClick={() => navigate("catalog")}>Start Shopping</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {userOrders.map(order => (
              <div key={order._id} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, background: T.input }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Order #{order._id?.slice(-6)}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>Placed on {new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.accent }}>${order.total?.toFixed(2) || "0.00"}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(order.status), background: `${getStatusColor(order.status)}20`, padding: "4px 8px", borderRadius: 6, display: "inline-block", marginTop: 4 }}>
                      {order.status}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Items:</div>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, marginBottom: 10, background: T.card }}>
                      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: T.input, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                          {renderProductMedia(item.image || "???", 52)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                            <span>Qty: {item.quantity || item.qty || 1}</span>
                          </div>
                          <div style={{ fontSize: 12, color: T.muted }}>Message: Your order is being prepared with care and quality checks.</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: T.muted }}>Share your rating for this item</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{ ...styles.btn(false), padding: "4px 10px", fontSize: 11 }}
                            onClick={() => {
                              const productId = item.productId || item._id || item.id;
                              const key = `${order._id}-${productId}`;
                              setActiveReviewKey((prev) => prev === key ? "" : key);
                            }}
                          >
                            {activeReviewKey === `${order._id}-${(item.productId || item._id || item.id)}` ? "Close" : "Write Review"}
                          </button>
                          <button style={{ ...styles.btn(false), padding: "4px 10px", fontSize: 11 }} onClick={() => sendEnquiry(order, item)}>Send Enquiry</button>
                        </div>
                      </div>
                      {activeReviewKey === `${order._id}-${(item.productId || item._id || item.id)}` && (
                        <div style={{ marginTop: 10, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            {[1, 2, 3, 4, 5].map((star) => {
                              const productId = item.productId || item._id || item.id;
                              const draft = getDraft(order._id, productId);
                              return (
                                <button
                                  key={star}
                                  onClick={() => updateDraft(order._id, productId, { rating: star })}
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: star <= draft.rating ? "#f59e0b" : "#cbd5e1", padding: 0 }}
                                >
                                  ★
                                </button>
                              );
                            })}
                          </div>
                          <textarea
                            value={getDraft(order._id, item.productId || item._id || item.id).comment}
                            onChange={(e) => updateDraft(order._id, item.productId || item._id || item.id, { comment: e.target.value })}
                            placeholder="Write your review"
                            style={{ ...styles.input, minHeight: 80, fontFamily: "inherit", marginBottom: 8 }}
                          />
                          <button
                            style={{ ...styles.btn(true), padding: "6px 12px", fontSize: 12 }}
                            onClick={() => submitOrderItemReview(order._id, item)}
                            disabled={reviewSubmittingKey === `${order._id}-${(item.productId || item._id || item.id)}`}
                          >
                            {reviewSubmittingKey === `${order._id}-${(item.productId || item._id || item.id)}` ? "Submitting..." : "Submit Review"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, color: T.muted }}>Expected delivery: {getDeliveryDate(order.createdAt)} (7 days)</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...styles.btn(false), padding: "6px 12px", fontSize: 12 }} onClick={() => handleTrackOrder(order)}>Track Order</button>
                    {(order.status || "").toLowerCase() === "processing" && (
                      <button style={{ ...styles.btn(false), padding: "6px 12px", fontSize: 12, background: "#e74c3c", color: "#fff" }} onClick={() => deleteOrder(order._id)}>
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState(PRODUCTS); // Start with sample data, will be replaced by API
  const [catalogFilters, setCatalogFilters] = useState({ category: "All", priceMax: 100000, sort: "popular" });
  const [viewMode, setViewMode] = useState("grid");
  const [darkMode, setDarkMode] = useState(false);
  const [clothingRequest, setClothingRequest] = useState("");
  const [requestStatus, setRequestStatus] = useState(null);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [heroTemplates, setHeroTemplates] = useState(HERO_TEMPLATES);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredCatalogFilters = useDeferredValue(catalogFilters);
  const isMobile = viewportWidth <= 768;
  const isTablet = viewportWidth <= 1024;
  const pagePadding = isMobile ? "20px 14px" : "40px 24px";

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch(`${API_BASE}/templates`);
        if (!response.ok) {
          throw new Error(`Template API failed (${response.status})`);
        }
        const dbTemplates = await response.json();
        const normalized = normalizeTemplateList(dbTemplates);
        if (normalized.length > 0) {
          setHeroTemplates(normalized);
        }
      } catch (error) {
        console.log("DB template load skipped");
      }

    };
    loadTemplates();
  }, []);

  useEffect(() => {
    if (page !== "home" || heroTemplates.length === 0) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % Math.max(1, heroTemplates.length));
    }, 5000);
    return () => clearInterval(interval);
  }, [page, heroTemplates.length]);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    const savedToken = localStorage.getItem("authToken");
    const tokenLooksValid = savedToken && savedToken !== "null" && savedToken !== "undefined" && String(savedToken).split(".").length === 3;
    
    if (savedUser && tokenLooksValid) {
      // Validate token by making a test API call
      const validateToken = async () => {
        try {
          const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: { "Authorization": `Bearer ${savedToken}` }
          });
          if (response.ok) {
            setUser(JSON.parse(savedUser));
            setLoggedIn(true);
            
            // Load user's wishlist (handle 404 gracefully if endpoint doesn't exist)
            try {
              const wishlistData = await getWishlist();
              setWishlist(Array.isArray(wishlistData) ? wishlistData : (wishlistData.wishlist || []));
            } catch (error) {
              // Wishlist endpoint may not exist on backend, use local state instead
              setWishlist([]);
            }
          } else {
            // Token invalid, clear localStorage
            localStorage.removeItem("currentUser");
            localStorage.removeItem("authToken");
            setUser(null);
            setLoggedIn(false);
            setWishlist([]);
          }
        } catch (err) {
          // Network error, assume token is valid for now
          setUser(JSON.parse(savedUser));
          setLoggedIn(true);
          
          // Try to load wishlist, but use local state if endpoint unavailable
          try {
            const wishlistData = await getWishlist();
            setWishlist(Array.isArray(wishlistData) ? wishlistData : (wishlistData.wishlist || []));
          } catch (error) {
            setWishlist([]);
          }
        }
      };
      validateToken();
    } else if (savedUser || savedToken) {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("authToken");
      setUser(null);
      setLoggedIn(false);
      setWishlist([]);
    }
  }, []);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        if (response.ok) {
          const apiProducts = await response.json();
          const transformedProducts = apiProducts.map(mapApiProductToUi);
          setProducts(transformedProducts);
          console.log("Products loaded from API:", transformedProducts.length);
        } else {
          console.log("API not available, using sample products");
        }
      } catch (error) {
        console.log("Failed to load products from API, using sample data");
      }
    };
    loadProducts();
  }, []);

  const showToast = useCallback((msg) => {
    setToast({ show: true, msg });
  }, []);

  const getStatusColor = (status) => {
    const statusColors = {
      'pending': '#f59e0b',
      'processing': '#3b82f6',
      'shipped': '#10b981',
      'delivered': '#06b6d4',
      'cancelled': '#ef4444'
    };
    return statusColors[status?.toLowerCase()] || '#6b7280';
  };

  const signupUser = async (username, mobile, email, password) => {
    if (!username || !mobile || !email || !password) {
      showToast("Error: Fill all fields");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, mobile, email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(`Error: ${data.message}`);
        return;
      }
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);
      setUser(data.user);
      setLoggedIn(true);
      showToast("Success: Signup successful! Welcome!");
      setPage("home");
    } catch (err) {
      showToast("Error: Signup failed. Check backend connection.");
    }
  };

  const loginUser = async (identifier, password) => {
    if (!identifier || !password) {
      showToast("Error: Enter email/mobile and password");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(`Error: ${data.message}`);
        return;
      }
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);
      setUser(data.user);
      setLoggedIn(true);
      
      // Load user's wishlist
      try {
        const wishlistData = await getWishlist();
        setWishlist(Array.isArray(wishlistData) ? wishlistData : (wishlistData.wishlist || []));
      } catch (error) {
        console.error("Failed to load wishlist:", error);
        setWishlist([]);
      }
      
      showToast(`Success: Welcome back, ${data.user.username}!`);
      setPage("home");
    } catch (err) {
      showToast("Error: Login failed. Check backend connection.");
    }
  };

  const logoutUser = () => {
    setUser(null);
    setLoggedIn(false);
    setCart([]);
    setWishlist([]);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
    showToast("?? Logged out");
    setPage("home");
  };

  const navigate = (p, product = null) => {
    setPage(p);
    setSelectedProduct(product);
    setSearchOpen(false);
  };

  const addToCart = (product, qty = 1) => {
    if (!loggedIn) {
      showToast("Error: Please login first to add items to bag");
      navigate("login");
      return;
    }
    const productId = product._id || product.id;
    fetch(`${API_BASE}/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("authToken")}`
      },
      body: JSON.stringify({
        productId,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image
      })
    }).catch(() => {
      // UI state update still proceeds, backend sync can retry later.
    });

    setCart(prev => {
      const exists = prev.find(i => normalizeId(i._id || i.id) === normalizeId(productId));
      if (exists) {
        return prev.map(i => normalizeId(i._id || i.id) === normalizeId(productId) ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { ...product, qty }];
    });
    showToast(`? ${product.name} added to bag`);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const updateQty = (id, delta) =>
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
        .filter(i => i.qty > 0)
    );

  const toggleWishlist = async (id) => {
    if (!loggedIn) {
      showToast("Error: Please login to manage wishlist");
      return;
    }
    try {
      const result = await toggleWishlistItem(id);
      // Update local state based on API response
      setWishlist(result.wishlist);
      showToast(result.message);
    } catch (error) {
      if (error?.status === 401) {
        setLoggedIn(false);
        setUser(null);
        setWishlist([]);
        localStorage.removeItem("currentUser");
        localStorage.removeItem("authToken");
        showToast("Error: Session expired. Please login again.");
        navigate("login");
        return;
      }
      showToast(`Error: ${error.message || "Failed to update wishlist"}`);
    }
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const searchResults = useMemo(() => {
    if (deferredSearchQuery.length <= 1) return [];
    const query = deferredSearchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [products, deferredSearchQuery]);

  const filteredProducts = useMemo(() => products.filter(p => {
    if (deferredCatalogFilters.category === "wishlist") {
      return isProductInWishlist(wishlist, p);
    }
    if (deferredCatalogFilters.category !== "All" && normalizeCategory(p.category) !== deferredCatalogFilters.category) return false;
    if (p.price > deferredCatalogFilters.priceMax) return false;
    return true;
  }).sort((a, b) => {
    if (deferredCatalogFilters.sort === "price-asc") return a.price - b.price;
    if (deferredCatalogFilters.sort === "price-desc") return b.price - a.price;
    if (deferredCatalogFilters.sort === "rating") return b.rating - a.rating;
    return b.reviews - a.reviews;
  }), [products, wishlist, deferredCatalogFilters]);

  const recentProducts = useMemo(() => [...products].reverse().slice(0, 4), [products]);
  const homeCollections = useMemo(() => (
    ["Women's", "Accessories"].map((category) => ({
      category,
      items: products.filter((p) => normalizeCategory(p.category) === category).slice(0, 4)
    }))
  ), [products]);

  const T = useMemo(() => darkMode ? {
    bg: "#0f0f13", card: "#1a1a24", cardHover: "#22222e", text: "#f0eee8", muted: "#8a8a95", accent: "#e8c87a", accentDark: "#d4a843", border: "#2a2a35", input: "#16161f", navBg: "rgba(15,15,19,.85)"
  } : {
    bg: "#f5f2eb", card: "#ffffff", cardHover: "#f9f7f2", text: "#1a1a2e", muted: "#6b6b75", accent: "#1a1a2e", accentDark: "#0f0f13", border: "#e0ddd6", input: "#eeebe3", navBg: "rgba(245,242,235,.9)"
  }, [darkMode]);

  const styles = useMemo(() => ({
    app: { fontFamily: "'Playfair Display', serif", background: T.bg, color: T.text, minHeight: "100vh", transition: "background .3s, color .3s" },
    nav: { position: "sticky", top: 0, zIndex: 100, background: T.navBg, backdropFilter: "blur(18px)", borderBottom: `1px solid ${T.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, gap: 16 },
    logo: { fontSize: 22, fontWeight: 700, color: T.accent, cursor: "pointer", letterSpacing: "-0.5px", fontStyle: "italic" },
    navLinks: { display: "flex", gap: 24, fontSize: 13, color: T.muted, fontFamily: "'Playfair Display', serif" },
    iconBtn: { background: "none", border: "none", color: T.text, cursor: "pointer", position: "relative", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" },
    badge: { position: "absolute", top: -4, right: -6, background: T.accent, color: darkMode ? "#0f0f13" : "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 5px", minWidth: 16, textAlign: "center" },
    heroSection: { position: "relative", height: 420, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden" },
    heroText: { color: "#2c3e50", zIndex: 2, padding: 24 },
    heroTitle: { fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 700, margin: 0, letterSpacing: "-1px", lineHeight: 1.1 },
    heroSub: { fontSize: 18, color: "rgba(255,255,255,.7)", margin: "16px 0 32px", fontStyle: "italic" },
    btn: (primary = true) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 30px", borderRadius: 10, border: "none", fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .2s", letterSpacing: "0.5px", ...(primary ? { background: T.accent, color: darkMode ? "#0f0f13" : "#fff" } : { background: "transparent", color: T.text, border: `1.5px solid ${T.border}` }) }),
    sectionTitle: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 8px", color: T.text },
    sectionSub: { color: T.muted, fontSize: 14, margin: "0 0 32px", fontStyle: "italic" },
    productCard: { background: T.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.border}`, transition: "transform .25s, box-shadow .25s", cursor: "pointer", display: "flex", flexDirection: "column" },
    productImg: { height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, background: `linear-gradient(135deg, ${T.border}, ${T.card})` },
    productInfo: { padding: 18, flex: 1, display: "flex", flexDirection: "column" },
    tag: (color) => ({ display: "inline-block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", padding: "3px 9px", borderRadius: 20, background: color === "gold" ? (darkMode ? "rgba(232,200,122,.15)" : "rgba(26,26,46,.1)") : "rgba(255,80,80,.15)", color: color === "gold" ? T.accent : "#e85050" }),
    filterBar: { display: "flex", flexWrap: "wrap", gap: 10, padding: "0 0 24px", alignItems: "center" },
    select: { background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontFamily: "'Playfair Display', serif", cursor: "pointer", outline: "none" },
    cartOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", justifyContent: isMobile ? "flex-end" : "flex-end", alignItems: isMobile ? "flex-end" : "stretch" },
    cartPanel: { position: "relative", background: T.card, width: isMobile ? "100%" : "min(400px, 95vw)", height: isMobile ? "90vh" : "100%", overflowY: "auto", padding: isMobile ? "20px 16px 12px" : "18px 20px 12px", display: "flex", flexDirection: "column", boxShadow: isMobile ? "0 -8px 40px rgba(0,0,0,.3)" : "-8px 0 40px rgba(0,0,0,.3)", borderRadius: isMobile ? "20px 20px 0 0" : 0 },
    input: { background: T.input, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px", color: T.text, fontSize: 14, fontFamily: "'Playfair Display', serif", outline: "none", width: "100%", boxSizing: "border-box" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  }), [T, darkMode]);

  // Navbar
  const Navbar = () => (
    <nav style={{
      ...styles.nav,
      padding: isMobile ? "12px 14px" : "16px 24px",
      justifyContent: isMobile ? "space-between" : "space-around",
      alignItems: "center",
      gap: isMobile ? 8 : 16,
      flexWrap: isMobile ? "nowrap" : "wrap"
    }}>
      {/* Mobile Hamburger Menu - Only on mobile */}
      {isMobile && (
        <button
          style={{
            background: "none",
            border: "none",
            color: T.accent,
            cursor: "pointer",
            fontSize: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 8
          }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? "?" : "?"}
        </button>
      )}

      {/* Desktop Left Section - Hidden on mobile */}
      <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 16 }}>
        {page !== "home" && (
          <button style={styles.iconBtn} onClick={() => navigate("home")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        )}
        {/* Category Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          {["All", "Men's", "Women's", "Accessories"].map(category => (
            <button
              key={category}
              onClick={() => {
                setCatalogFilters(f => ({ ...f, category: category }));
                navigate("catalog");
              }}
              style={{
                background: catalogFilters.category === category ? T.accent : "transparent",
                color: catalogFilters.category === category ? (darkMode ? "#0f0f13" : "#fff") : T.text,
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: catalogFilters.category === category ? 700 : 500,
                transition: "all .2s"
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      {/* Center: Logo - Responsive size */}
      <div style={{ 
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        textAlign: "center",
        flex: isMobile ? 1 : 0,
        lineHeight: 1,
        fontFamily: "'Arial', 'Helvetica', sans-serif"
      }} onClick={() => navigate("home")}>
        <div style={{
          fontSize: isMobile ? 20 : 30,
          fontWeight: 900,
          color: T.accent,
          letterSpacing: "3.5px",
          textTransform: "uppercase",
          display: "inline-block",
          transform: "scaleX(1.12)",
          transformOrigin: "center"
        }}>NAA</div>
        <div style={{
          fontSize: isMobile ? 20 : 30,
          fontWeight: 900,
          color: T.accent,
          letterSpacing: "3.5px",
          textTransform: "uppercase",
          marginTop: "-2px",
          display: "inline-block",
          transform: "scaleX(1.12)",
          transformOrigin: "center"
        }}>Naa</div>
      </div>
      
      {/* Right Section: Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 6 }}>
        {(user?.role === "admin" || user?.email === "admin@naananaa.local") && (
          <button
            style={{ ...styles.btn(false), padding: "8px 12px", fontSize: 12 }}
            onClick={() => navigate("admin")}
          >
            ?? Admin Portal
          </button>
        )}
        {user?.role !== "admin" && (
          <>
            {/* Liked/Wishlist Icon - Shows wishlist count */}
            <button style={{
              ...styles.iconBtn,
              width: isMobile ? 40 : "auto",
              height: isMobile ? 40 : "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }} onClick={() => {
              setCatalogFilters(f => ({ ...f, category: "wishlist" }));
              navigate("catalog");
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {wishlist.length > 0 && <span style={styles.badge}>{wishlist.length}</span>}
            </button>
          </>
        )}
        <button style={{
          ...styles.iconBtn,
          width: isMobile ? 40 : "auto",
          height: isMobile ? 40 : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} onClick={() => setSearchOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
        <button style={{
          ...styles.iconBtn,
          width: isMobile ? 40 : "auto",
          height: isMobile ? 40 : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} onClick={() => setCartOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
        </button>
        <button style={{
          ...styles.iconBtn,
          width: isMobile ? 40 : "auto",
          height: isMobile ? 40 : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }} onClick={() => loggedIn ? navigate("profile") : navigate("login")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="8" r="4"/></svg>
        </button>
      </div>

      {/* Mobile Menu Drawer - Shows below navbar on mobile */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: T.card,
          borderBottom: `1px solid ${T.border}`,
          padding: "16px 14px",
          zIndex: 100,
          boxShadow: "0 8px 16px rgba(0,0,0,.1)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["All", "Men's", "Women's", "Accessories"].map(category => (
              <button
                key={category}
                onClick={() => {
                  setCatalogFilters(f => ({ ...f, category: category }));
                  navigate("catalog");
                  setMobileMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  background: catalogFilters.category === category ? T.accent : T.input,
                  color: catalogFilters.category === category ? (darkMode ? "#0f0f13" : "#fff") : T.text,
                  border: "none",
                  padding: "12px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: catalogFilters.category === category ? 700 : 500,
                  transition: "all .2s",
                  textAlign: "left"
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );

  // Search
  const SearchModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 300, display: "flex", justifyContent: isMobile ? "flex-end" : "flex-start", padding: isMobile ? 0 : 16, opacity: searchOpen ? 1 : 0, pointerEvents: searchOpen ? "auto" : "none" }} onClick={() => setSearchOpen(false)}>
      <div style={{ background: T.card, borderRadius: isMobile ? "20px 20px 0 0" : 20, width: isMobile ? "100%" : "min(400px, 95vw)", height: isMobile ? "90vh" : "100%", padding: isMobile ? 20 : 28, boxShadow: isMobile ? "0 -8px 40px rgba(0,0,0,.3)" : "8px 0 40px rgba(0,0,0,.3)", transform: searchOpen ? "translateY(0)" : (isMobile ? "translateY(100%)" : "translateX(-100%)"), transition: "transform .3s ease-out, opacity .3s ease-out" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Search</h3>
          <button style={{ background: "none", border: "none", color: T.text, cursor: "pointer", fontSize: 24 }} onClick={() => setSearchOpen(false)}>?</button>
        </div>
        <input autoFocus style={{ ...styles.input, fontSize: 16 }} placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setSearchOpen(false); navigate("catalog"); } }} />
        {searchResults.length > 0 && (
          <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`, maxHeight: "60vh", overflowY: "auto" }}>
            {searchResults.map(p => (
              <div key={p.id} onClick={() => { setSearchOpen(false); navigate("product", p); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", cursor: "pointer", borderBottom: `1px solid ${T.border}` }} onMouseEnter={e => e.currentTarget.style.background = T.cardHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {renderProductMedia(p.image, 36)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{p.brand} � {p.category}</div>
                </div>
                <div style={{ fontWeight: 700, color: T.accent }}>{formatPrice(p.price)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Cart
  const CartPanel = () => (
    <div style={{ ...styles.cartOverlay, opacity: cartOpen ? 1 : 0, pointerEvents: cartOpen ? "auto" : "none" }} onClick={() => setCartOpen(false)}>
      <div style={{ ...styles.cartPanel, transform: cartOpen ? "translateY(0)" : "translateY(100%)", transition: "transform .3s ease-out" }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: "12px 14px",
          borderRadius: 14,
          background: `linear-gradient(135deg, ${T.input} 0%, ${T.card} 100%)`,
          border: `1px solid ${T.border}`
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.1 }}>Your Bag</h2>
            <div style={{ marginTop: 4, fontSize: 12, color: T.muted }}>{cartCount} item(s) ready for checkout</div>
          </div>
          <button style={{ ...styles.iconBtn, fontSize: 20, background: T.card, border: `1px solid ${T.border}` }} onClick={() => setCartOpen(false)}>�</button>
        </div>
        {cart.length === 0 ? (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: T.muted,
            border: `1px dashed ${T.border}`,
            borderRadius: 16,
            background: T.input,
            marginTop: 8
          }}>
            <span style={{ fontSize: 58 }}>???</span>
            <p style={{ marginTop: 12, fontSize: 14 }}>Your bag is empty</p>
            <button style={{ ...styles.btn(true), marginTop: 10 }} onClick={() => { setCartOpen(false); navigate("catalog"); }}>Browse Products</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 22 }}>
              {cart.map(item => (
                <div key={item.id} style={{
                  display: "flex",
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  boxShadow: "0 8px 20px rgba(0,0,0,.08)"
                }}>
                  <div style={{ width: 70, height: 70, borderRadius: 12, background: T.input, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>{renderProductMedia(item.image, 60)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: T.accent, fontWeight: 700, marginBottom: 6 }}>?{Number(item.price || 0).toFixed(2)}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => updateQty(item.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.input, color: T.text, cursor: "pointer" }}>-</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 18, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.input, color: T.text, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, alignSelf: "start" }}>�</button>
                </div>
              ))}
            </div>
            <div style={{
              position: "sticky",
              left: 0,
              right: 0,
              bottom: 78,
              borderTop: `1px solid ${T.border}`,
              paddingTop: 10,
              background: T.card,
              boxShadow: "0 -8px 24px rgba(0,0,0,.08)",
              zIndex: 10
            }}>
              <div style={{ background: `linear-gradient(145deg, ${T.input} 0%, ${T.card} 100%)`, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}><span style={{ color: T.muted }}>Subtotal</span><span style={{ color: T.text }}>?{cartTotal.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}><span style={{ color: T.muted }}>Delivery</span><span style={{ color: cartTotal >= 500 ? "#16a34a" : T.text }}>{cartTotal >= 500 ? "Free" : "?50"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px dashed ${T.border}` }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontWeight: 700, color: T.accent }}>?{(cartTotal + (cartTotal >= 500 ? 0 : 50)).toFixed(2)}</span></div>
                <div style={{ marginTop: 6, fontSize: 11, color: T.muted }}>Free shipping on orders above ?500</div>
              </div>
              <button style={{ ...styles.btn(true), width: "100%", justifyContent: "center", borderRadius: 12 }} onClick={() => { setCartOpen(false); navigate("checkout"); }}>Proceed to Checkout</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Home
  const HomePage = () => {
    const currentHero = heroTemplates[currentHeroIndex] || HERO_TEMPLATES[0];

    return (
      <div style={{ background: T.bg }}>
        {/* Hero Section with Templates */}
        <div style={{ ...styles.heroSection, background: currentHero.background, marginTop: 0 }}>
          {currentHero.mediaUrl && currentHero.mediaType === "image" && (
            <img src={currentHero.mediaUrl} alt="hero" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", background: "#0f172a" }} />
          )}
          {currentHero.mediaUrl && currentHero.mediaType === "video" && (
            <video src={currentHero.mediaUrl} muted playsInline autoPlay loop style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", background: "#0f172a" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: currentHero.overlay }} />
          <div style={{ position: "absolute", right: isMobile ? 12 : 28, bottom: isMobile ? 12 : "auto", top: isMobile ? "auto" : "50%", transform: isMobile ? "none" : "translateY(-50%)", zIndex: 3 }}>
            <button
              style={{ ...styles.btn(true), fontSize: isMobile ? 13 : 18, padding: isMobile ? "10px 14px" : "14px 34px", borderRadius: 14, fontWeight: 700 }}
              onClick={() => {
                setCatalogFilters((f) => ({ ...f, category: normalizeTemplateCategory(currentHero.targetCategory) }));
                navigate("catalog");
              }}
            >
              Explore Collection
            </button>
          </div>
        </div>

        {/* Recently Added Section */}
        <div style={{ padding: isMobile ? "28px 14px" : "56px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={styles.sectionTitle}>Recently Added</h2>
            <button
              onClick={() => {
                setCatalogFilters(f => ({ ...f, category: "Women's" }));
                navigate("catalog");
              }}
              style={{
                ...styles.btn(false),
                fontSize: 13,
                padding: "8px 16px",
                gap: 4
              }}
            >
              Explore More ?
            </button>
          </div>
          <p style={styles.sectionSub}>Check out our latest arrivals</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {recentProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>

        {/* Category Sections */}
        {homeCollections.map(({ category, items: categoryItems }) => {
          return (
            <div key={category} style={{ padding: isMobile ? "26px 14px" : "40px 24px", background: T.card, borderTop: `1px solid ${T.border}`, marginTop: isMobile ? 24 : 40 }}>
              <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <h2 style={{ ...styles.sectionTitle, fontSize: 28 }}>{category} Collection</h2>
                  <button
                    onClick={() => {
                      setCatalogFilters(f => ({ ...f, category: category }));
                      navigate("catalog");
                    }}
                    style={{
                      ...styles.btn(false),
                      fontSize: 13,
                      padding: "8px 16px",
                      gap: 4
                    }}
                  >
                    Explore More ?
                  </button>
                </div>
                <p style={styles.sectionSub}>{categoryItems.length} items available</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                  {categoryItems.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <footer style={{ marginTop: 60, borderTop: `1px solid ${T.border}`, padding: "56px 24px", background: darkMode ? "linear-gradient(180deg, #090a10 0%, #0f111a 100%)" : "linear-gradient(180deg, #f0ede6 0%, #e8e2d7 100%)", textAlign: "center" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", border: `1px solid ${T.border}`, borderRadius: 16, padding: "26px 18px", background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.55)", backdropFilter: "blur(2px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, marginBottom: 12, fontFamily: "'Arial', 'Helvetica', sans-serif" }}>
              <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "3.5px", textTransform: "uppercase", color: T.text, display: "inline-block", transform: "scaleX(1.12)", transformOrigin: "center" }}>NAA</span>
              <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "3.5px", textTransform: "uppercase", color: T.text, marginTop: "-2px", display: "inline-block", transform: "scaleX(1.12)", transformOrigin: "center" }}>Naa</span>
            </div>
            <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Curated collections for the discerning.</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div style={{ color: T.muted, fontSize: 13, cursor: "pointer", transition: "all .3s" }} onClick={() => { const msg = "Hello! I'd like to connect with NaaNaa."; window.open(`https://wa.me/918869821170?text=${encodeURIComponent(msg)}`, '_blank'); }} onMouseEnter={(e) => e.target.style.color = T.accent} onMouseLeave={(e) => e.target.style.color = T.muted}>
                ?? <strong style={{ color: T.text }}>8869821170</strong>
              </div>
              <div style={{ width: 1, height: 20, background: T.border }} />
              <a href="https://www.instagram.com/naanaa.we?igsh=djVybTFxMmk1d3hh" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, fontSize: 13, textDecoration: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all .3s" }} onMouseEnter={(e) => e.currentTarget.style.color = T.accent} onMouseLeave={(e) => e.currentTarget.style.color = T.muted}>
                <span>??</span> <strong style={{ color: T.text }}>@naanaa.we</strong>
              </a>
            </div>
            <p style={{ color: T.muted, fontSize: 12, marginTop: 24 }}>� 2025 <strong style={{ fontWeight: 700, color: T.text }}>NaaNaa</strong>. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  };

  const ProductCard = ({ product }) => {
    const disc = discount(product.originalPrice, product.price);
    const isWished = isProductInWishlist(wishlist, product);
    const [photoIndex, setPhotoIndex] = useState(0);
    const photos = (product.images && product.images.length > 0) ? product.images : [product.image];
    const currentPhoto = photos[photoIndex] || product.image;
    const touchStartX = useRef(null);

    useEffect(() => {
      if (photos.length <= 1) return;
      const timer = setInterval(() => {
        setPhotoIndex((prev) => (prev + 1) % photos.length);
      }, 2600);
      return () => clearInterval(timer);
    }, [photos.length]);
    
    return (
      <div style={styles.productCard} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${darkMode ? "rgba(0,0,0,.35)" : "rgba(0,0,0,.12)"}`; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
        <div
          style={{ ...styles.productImg, position: "relative" }}
          onClick={() => navigate("product", product)}
          onTouchStart={(e) => {
            if (photos.length > 1) touchStartX.current = e.changedTouches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (photos.length <= 1 || touchStartX.current === null) return;
            const deltaX = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(deltaX) > 30) {
              setPhotoIndex((prev) => {
                if (deltaX < 0) return (prev + 1) % photos.length;
                return (prev - 1 + photos.length) % photos.length;
              });
            }
            touchStartX.current = null;
          }}
        >
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {renderProductMedia(currentPhoto, 132)}
          </div>
          
          {/* Photo Navigation Dots */}
          {photos.length > 1 && (
            <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, zIndex: 10 }}>
              {photos.map((_, idx) => (
                <div
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setPhotoIndex(idx); }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: idx === photoIndex ? T.accent : "rgba(255,255,255,.4)",
                    cursor: "pointer",
                    transition: "all .2s"
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Photo Swipe Arrows */}
          {photos.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex - 1 + photos.length) % photos.length); }}
                style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.8)", border: "none", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, zIndex: 10 }}
              >
                ?
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex + 1) % photos.length); }}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.8)", border: "none", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, zIndex: 10 }}
              >
                ?
              </button>
            </>
          )}
          
          {disc && <span style={{ position: "absolute", top: 12, right: 12, ...styles.tag("red") }}>-{disc}%</span>}
          <button onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }} style={{ position: "absolute", top: 12, right: disc ? 56 : 12, background: "rgba(255,255,255,.85)", border: "none", borderRadius: 20, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 17 }}>{isWished ? "??" : "??"}</button>
        </div>
        <div style={styles.productInfo} onClick={() => navigate("product", product)}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>{product.brand}</div>
          <div style={{ fontSize: 15, fontWeight: 600, margin: "4px 0", flex: 1 }}>{product.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><StarRating rating={product.rating} size={13} /><span style={{ fontSize: 12, color: T.muted }}>({product.reviews})</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: T.accent }}>{formatPrice(product.price)}</span>
            {product.originalPrice && <span style={{ fontSize: 13, color: T.muted, textDecoration: "line-through" }}>{formatPrice(product.originalPrice)}</span>}
          </div>
        </div>
        <div style={{ padding: "0 18px 18px" }}>
          <button style={{ ...styles.btn(true), width: "100%", padding: "11px 0", justifyContent: "center", fontSize: 13 }} onClick={(e) => { e.stopPropagation(); addToCart(product); }}>Add to Bag</button>
        </div>
      </div>
    );
  };

  // Catalog
  const CatalogPage = () => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: pagePadding }}>
      <h1 style={{ ...styles.sectionTitle, fontSize: isMobile ? 28 : 34 }}>
        {catalogFilters.category === "All" ? "All Products" : 
         catalogFilters.category === "wishlist" ? "Liked Items" :
         `${catalogFilters.category} Collection`}
      </h1>
      {catalogFilters.category === "Men's" ? (
        <div style={{
          marginTop: 18,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #334155 100%)",
          borderRadius: 16,
          border: `1px solid ${T.border}`,
          padding: "46px 28px",
          color: "#e2e8f0",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>Coming Soon</div>
          <div style={{ fontSize: 15, opacity: 0.9, maxWidth: 680, margin: "0 auto", lineHeight: 1.8 }}>
            Men&apos;s collection is under curation right now. We are crafting a sharper, cleaner line-up for launch.
            Stay tuned for a premium drop very soon.
          </div>
        </div>
      ) : (
        <>
          <p style={styles.sectionSub}>{filteredProducts.length} items found</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );

  // Product Detail - DB Driven
  const ProductDetailPage = () => {
    const [qty, setQty] = useState(1);
    const [mainImageIdx, setMainImageIdx] = useState(0);
    const [selectedSize, setSelectedSize] = useState("");
    const [productData, setProductData] = useState(selectedProduct);
    const [reviewList, setReviewList] = useState(Array.isArray(selectedProduct?.reviewList) ? selectedProduct.reviewList : []);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState("");

    const productId = selectedProduct?._id || selectedProduct?.id;

    useEffect(() => {
      setProductData(selectedProduct);
      setMainImageIdx(0);
      setSelectedSize("");
      setReviewComment("");
      setReviewRating(5);
      setEditingReviewId("");
      setReviewList(Array.isArray(selectedProduct?.reviewList) ? selectedProduct.reviewList : []);
    }, [productId]);

    useEffect(() => {
      if (!productId) return;

      const loadProductDetails = async () => {
        try {
          const [productResResult, reviewsResResult] = await Promise.allSettled([
            fetch(`${API_BASE}/products/${productId}`),
            getProductReviews(productId)
          ]);

          if (productResResult.status === "fulfilled" && productResResult.value.ok) {
            const productJson = await productResResult.value.json();
            setProductData(mapApiProductToUi(productJson));
          }

          if (reviewsResResult.status === "fulfilled" && Array.isArray(reviewsResResult.value.reviewList)) {
            setReviewList(reviewsResResult.value.reviewList);
          }
        } catch (error) {
          // Keep previously selected data as fallback.
        }
      };

      loadProductDetails();
    }, [productId]);

    const product = productData || selectedProduct;
    if (!product) return null;

    const disc = discount(product.originalPrice, product.price);
    const images = Array.isArray(product.images) && product.images.length ? product.images : [product.image || "???"];
    const sizes = normalizeCategory(product.category) === "Accessories" ? [] : (Array.isArray(product.sizes) ? product.sizes : []);
    const isWishlisted = isProductInWishlist(wishlist, product);
    const relatedProducts = products
      .filter((p) => normalizeCategory(p.category) === normalizeCategory(product.category) && normalizeId(p._id || p.id) !== normalizeId(product._id || product.id))
      .slice(0, 4);

    useEffect(() => {
      if (sizes.length && !selectedSize) {
        setSelectedSize(sizes[0]);
      }
    }, [sizes, selectedSize]);

    const submitReview = async () => {
      if (!loggedIn) {
        showToast("Error: Please login first to add review");
        navigate("login");
        return;
      }
      if (user?.role === "admin") {
        showToast("Error: Admin cannot submit product review");
        return;
      }
      if (!reviewComment.trim()) {
        showToast("Error: Please write your review");
        return;
      }

      setSubmittingReview(true);
      try {
        const result = await addProductReview(productId, {
          rating: reviewRating,
          comment: reviewComment.trim()
        });
        setReviewList(Array.isArray(result.reviewList) ? result.reviewList : []);
        setReviewComment("");
        setEditingReviewId("");
        showToast("Success: Review submitted");

        setProductData(prev => ({
          ...(prev || product),
          rating: Number(result.rating) || 0,
          reviews: Number(result.reviews) || 0,
          reviewList: Array.isArray(result.reviewList) ? result.reviewList : []
        }));

        setProducts(prev => prev.map((p) => {
          if (normalizeId(p._id || p.id) !== normalizeId(productId)) return p;
          return {
            ...p,
            rating: Number(result.rating) || 0,
            reviews: Number(result.reviews) || 0,
            reviewList: Array.isArray(result.reviewList) ? result.reviewList : []
          };
        }));
      } catch (error) {
        showToast(`Error: ${error.msg || error.message || "Failed to submit review"}`);
      } finally {
        setSubmittingReview(false);
      }
    };

    const currentUserId = normalizeId(user?._id || user?.id);

    const startEditReview = (review) => {
      setEditingReviewId(String(review._id || ""));
      setReviewRating(Number(review.rating) || 5);
      setReviewComment(review.comment || "");
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    };

    const handleDeleteReview = async (review) => {
      if (!window.confirm("Delete this review?")) return;
      try {
        const result = await deleteProductReview(productId, review._id);
        setReviewList(Array.isArray(result.reviewList) ? result.reviewList : []);
        setProductData(prev => ({ ...(prev || product), rating: Number(result.rating) || 0, reviews: Number(result.reviews) || 0 }));
        setProducts(prev => prev.map((p) => normalizeId(p._id || p.id) === normalizeId(productId)
          ? { ...p, rating: Number(result.rating) || 0, reviews: Number(result.reviews) || 0, reviewList: Array.isArray(result.reviewList) ? result.reviewList : [] }
          : p
        ));
        showToast("Success: Review deleted");
      } catch (error) {
        showToast(`Error: ${error.msg || error.message || "Failed to delete review"}`);
      }
    };

    const handleAddToCart = () => {
      const finalSize = selectedSize || sizes[0] || "";
      if (sizes.length && !selectedSize) {
        setSelectedSize(finalSize);
      }
      addToCart({ ...product, selectedSize: finalSize }, qty);
    };

    return (
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: isMobile ? "18px 14px 34px" : "28px 24px 56px" }}>
        <div onClick={() => navigate("catalog")} style={{ color: T.muted, cursor: "pointer", fontSize: 12, marginBottom: 18 }}>
          Catalog � {product.category} � {product.name}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1.1fr 1fr", gap: isMobile ? 18 : 32, alignItems: "start" }}>
          <div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, height: isMobile ? 320 : 440, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" }}>
              {renderProductMedia(images[mainImageIdx], isMobile ? 240 : 320)}
              {disc ? <span style={{ position: "absolute", top: 12, right: 12, background: "#dc2626", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontWeight: 700 }}>-{disc}%</span> : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(4, minmax(56px, 1fr))" : "repeat(5, minmax(64px, 1fr))", gap: 8 }}>
              {images.map((img, idx) => (
                <button
                  key={`${idx}-${String(img).slice(0, 12)}`}
                  onClick={() => setMainImageIdx(idx)}
                  style={{
                    height: 72,
                    borderRadius: 8,
                    border: mainImageIdx === idx ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                    background: T.card,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {renderProductMedia(img, 54)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: isMobile ? 24 : 30, lineHeight: 1.25, margin: "0 0 8px" }}>{product.name}</h1>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>Brand: <strong style={{ fontWeight: 700, color: T.text, textTransform: "uppercase" }}>{product.brand || "NaaNaa"}</strong></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <StarRating rating={Number(product.rating) || 0} size={16} />
              <span style={{ fontSize: 13, color: T.muted }}>{Number(product.rating || 0).toFixed(1)} ({Number(product.reviews) || 0} reviews)</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <span style={{ fontSize: isMobile ? 28 : 34, fontWeight: 700, color: T.accent }}>{formatPrice(product.price)}</span>
              {Number(product.originalPrice) > Number(product.price) ? <span style={{ color: T.muted, textDecoration: "line-through" }}>{formatPrice(product.originalPrice)}</span> : null}
            </div>

            <div style={{ marginBottom: 16, color: "#059669", fontWeight: 600 }}>Limited Stock</div>

            {sizes.length ? (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Select Size</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: selectedSize === size ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                        background: selectedSize === size ? T.input : T.card,
                        cursor: "pointer",
                        fontWeight: 600,
                        color: T.text
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 38, height: 38, border: "none", background: T.input, cursor: "pointer", color: T.text }}>-</button>
                <div style={{ width: 40, textAlign: "center", fontWeight: 700 }}>{qty}</div>
                <button onClick={() => setQty(qty + 1)} style={{ width: 38, height: 38, border: "none", background: T.input, cursor: "pointer", color: T.text }}>+</button>
              </div>
              <button onClick={handleAddToCart} style={{ ...styles.btn(true), flex: 1, justifyContent: "center" }}>
                Add to Bag
              </button>
              <button onClick={() => toggleWishlist(product._id || product.id)} style={{ ...styles.btn(false), width: 54, padding: 0, justifyContent: "center" }}>
                {isWishlisted ? "??" : "??"}
              </button>
            </div>

            <div style={{ background: T.input, borderRadius: 12, border: `1px solid ${T.border}`, padding: 18 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 17 }}>About this item</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: T.muted, fontSize: 14, lineHeight: 1.8 }}>
                <li>{product.description || "No description available."}</li>
                <li>Delivery within 7 days</li>
                <li>5 days return policy</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 42 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>More from {product.category}</h2>
          {relatedProducts.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {relatedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div style={{ color: T.muted, fontSize: 14 }}>No related products available right now.</div>
          )}
        </div>

        <div style={{ marginTop: 48, borderTop: `1px solid ${T.border}`, paddingTop: 28 }}>
          <h2 style={{ fontSize: 24, marginBottom: 18 }}>Ratings & Reviews</h2>

          {loggedIn && user?.role !== "admin" ? (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{editingReviewId ? "Edit your review" : "Write a review"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: T.muted }}>Your rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: star <= reviewRating ? "#f59e0b" : "#cbd5e1", padding: 0 }}
                  >
                    ?
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with this product"
                style={{ ...styles.input, minHeight: 92, marginBottom: 12, fontFamily: "inherit" }}
              />
              <button onClick={submitReview} disabled={submittingReview} style={{ ...styles.btn(true), justifyContent: "center", minWidth: 180 }}>
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
              {editingReviewId ? (
                <button onClick={() => { setEditingReviewId(""); setReviewComment(""); setReviewRating(5); }} style={{ ...styles.btn(false), justifyContent: "center", minWidth: 120, marginLeft: 8 }}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>
              {loggedIn ? "Admin users cannot add reviews." : "Login to submit your review."}
            </div>
          )}

          {reviewList.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {reviewList.map((review, index) => (
                <div key={`${review.userId || "r"}-${review._id || index}`} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{review.userName || "Customer"}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{new Date(review.updatedAt || review.createdAt || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}><StarRating rating={Number(review.rating) || 0} size={14} /></div>
                  <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>{review.comment}</div>
                  {normalizeId(review.userId) === currentUserId && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button style={{ ...styles.btn(false), padding: "6px 10px", fontSize: 12 }} onClick={() => startEditReview(review)}>Edit</button>
                      <button style={{ ...styles.btn(false), padding: "6px 10px", fontSize: 12, background: "#dc2626", color: "#fff" }} onClick={() => handleDeleteReview(review)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: T.input, borderRadius: 10, padding: 16, color: T.muted, fontSize: 14 }}>No reviews yet. Be the first customer to review this product.</div>
          )}
        </div>
      </div>
    );
  };

  // Checkout
  const CheckoutPage = () => {
    const [addressData, setAddressData] = useState({ name: "", address: "", mobile: "" });
    const [errors, setErrors] = useState({});
    const [orderPlaced, setOrderPlaced] = useState(false);
    const deliveryCharge = cartTotal >= 500 ? 0 : 50;
    const totalWithDelivery = cartTotal + deliveryCharge;

    const validateForm = () => {
      const newErrors = {};
      if (!addressData.name.trim()) newErrors.name = "Name is required";
      if (addressData.name.trim() && addressData.name.trim().length < 3) newErrors.name = "Name must be at least 3 characters";
      if (!addressData.address.trim()) newErrors.address = "Address is required";
      if (addressData.address.trim() && addressData.address.trim().length < 10) newErrors.address = "Address should be at least 10 characters";
      if (!addressData.mobile.trim()) newErrors.mobile = "Mobile number is required";
      if (addressData.mobile.trim() && !/^\d{10}$/.test(addressData.mobile.replace(/\D/g, ''))) {
        newErrors.mobile = "Mobile must be 10 digits";
      }
      return newErrors;
    };

    const handleOrder = async () => {
      const newErrors = validateForm();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        showToast("Error: Please fill all fields correctly");
        return;
      }

      try {
        const orderData = {
          name: addressData.name,
          mobile: addressData.mobile,
          address: addressData.address,
          items: cart.map(item => ({
            productId: item._id || item.id,
            name: item.name,
            price: item.price,
            qty: item.qty || item.quantity || 1,
            quantity: item.qty || item.quantity || 1,
            image: item.image || ""
          })),
          total: totalWithDelivery,
          deliveryCharge,
          userId: user?.id || null
        };

        const response = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`
          },
          body: JSON.stringify(orderData)
        });

        if (response.ok) {
          const responseData = await response.json();
          
          // Generate WhatsApp message
          const orderId = responseData.order._id?.toString().slice(-6).toUpperCase() || 'NEW';
          const itemsList = cart
            .map(item => `� ${item.name} x${item.qty || item.quantity || 1} - ?${item.price}`)
            .join('\n');
          const whatsappMessage = `? *Mujhe ye order place karna hai*\n\nOrder ID: ${orderId}\nCustomer Name: ${addressData.name}\nCustomer Username: ${user?.username || 'N/A'}\nCustomer Email: ${user?.email || 'N/A'}\nCustomer Mobile: ${addressData.mobile}\nShipping Address: ${addressData.address}\n\nItems:\n${itemsList}\n\nSubtotal: ?${cartTotal.toFixed(2)}\nDelivery Charge: ?${deliveryCharge.toFixed(2)}\nGrand Total: ?${totalWithDelivery.toFixed(2)}\nPayment Mode: Prepaid (Online)\nPayment Status: Paid\n\nKindly process and confirm this order.`;
          
          const adminNumber = '918869821170';
          const encodedMessage = encodeURIComponent(whatsappMessage);
          const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodedMessage}`;
          
          window.open(whatsappUrl, '_blank');
          
          setOrderPlaced(true);
          setCart([]);
          showToast("Success: Order placed successfully!");
          setTimeout(() => {
            navigate(loggedIn ? "profile" : "home");
          }, 3000);
        } else {
          const errorData = await response.json();
          showToast(`Error: ${errorData.msg || 'Order failed'}`);
        }
      } catch (error) {
        showToast("Error: Network error - please try again");
      }
    };

    if (orderPlaced) {
      return (
        <div style={{ maxWidth: 600, margin: "120px auto", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>?</div>
          <h1 style={{ ...styles.sectionTitle, fontSize: 32, marginBottom: 12 }}>Order Confirmed!</h1>
          <p style={styles.sectionSub}>Your order has been placed successfully.</p>
          <p style={{ color: T.muted, fontSize: 14, marginBottom: 28 }}>You'll receive updates on WhatsApp.</p>
          <button style={{ ...styles.btn(true), padding: "12px 32px" }} onClick={() => navigate("home")}>Continue Shopping</button>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 700, margin: isMobile ? "30px auto" : "80px auto", padding: pagePadding }}>
        <h1 style={{ ...styles.sectionTitle, fontSize: 32, marginBottom: 8 }}>Checkout</h1>
        <p style={styles.sectionSub}>Complete your order</p>

        <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "2fr 1fr", gap: isMobile ? 16 : 32, marginTop: 32 }}>
          {/* Checkout Form */}
          <div>
            <div style={{ background: T.card, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: T.text }}>Delivery Address</h2>

              {/* Name Field */}
              <label style={{ display: "block", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 8 }}>Full Name *</span>
                <input
                  type="text"
                  style={{ ...styles.input, borderColor: errors.name ? "#ef4444" : styles.input.borderColor }}
                  placeholder="John Doe"
                  value={addressData.name}
                  onChange={e => {
                    setAddressData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                  }}
                />
                {errors.name && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>?? {errors.name}</span>}
              </label>

              {/* Mobile Field */}
              <label style={{ display: "block", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 8 }}>Mobile Number *</span>
                <input
                  type="tel"
                  style={{ ...styles.input, borderColor: errors.mobile ? "#ef4444" : styles.input.borderColor }}
                  placeholder="9876543210"
                  value={addressData.mobile}
                  onChange={e => {
                    const digit = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setAddressData(prev => ({ ...prev, mobile: digit }));
                    if (errors.mobile) setErrors(prev => ({ ...prev, mobile: "" }));
                  }}
                />
                {errors.mobile && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>?? {errors.mobile}</span>}
              </label>

              {/* Address Field */}
              <label style={{ display: "block", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 8 }}>Delivery Address *</span>
                <textarea
                  style={{ ...styles.input, minHeight: 100, fontFamily: "inherit" , borderColor: errors.address ? "#ef4444" : styles.input.borderColor }}
                  placeholder="House no., street, area, city, state, postal code"
                  value={addressData.address}
                  onChange={e => {
                    setAddressData(prev => ({ ...prev, address: e.target.value }));
                    if (errors.address) setErrors(prev => ({ ...prev, address: "" }));
                  }}
                />
                {errors.address && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" }}>?? {errors.address}</span>}
              </label>

              {/* Delivery Info */}
              <div style={{ background: T.input, padding: 16, borderRadius: 12, marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: T.text }}>?? Delivery Information</div>
                <ul style={{ fontSize: 13, color: T.muted, margin: 0, paddingLeft: 20, listStyle: "none" }}>
                  <li style={{ marginBottom: 4 }}>? Estimated delivery: 5-7 business days</li>
                  <li style={{ marginBottom: 4 }}>? Free shipping on orders above ?500</li>
                  <li style={{ marginBottom: 4 }}>? Delivery charge ?50 below ?500</li>
                  <li style={{ marginBottom: 4 }}>? Online prepaid payment only</li>
                  <li style={{ marginBottom: 4 }}>?? After placing your order, you'll be redirected to WhatsApp for direct payment confirmation - ensuring transparency and building trust with every purchase.</li>
                </ul>
                <div style={{ fontSize: 12, color: T.accent, marginTop: 12, fontStyle: "italic" }}>Your trust matters to us. All transactions are secured and transparently communicated.</div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div style={{ background: T.input, borderRadius: 16, padding: isMobile ? 18 : 24, border: `1px solid ${T.border}`, position: isTablet ? "static" : "sticky", top: 100 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: T.text }}>Order Summary</h2>
              
              {/* Items List */}
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 20, paddingRight: 8 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                    <div>
                      <div style={{ color: T.text, fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                      <div style={{ color: T.muted }}>Qty: {item.qty || item.quantity || 1}</div>
                    </div>
                    <div style={{ fontWeight: 600, color: T.accent, textAlign: "right" }}>?{(item.price * (item.qty || item.quantity || 1)).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Subtotal</span>
                  <span style={{ color: T.text }}>?{cartTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Shipping</span>
                  <span style={{ color: deliveryCharge === 0 ? "#16a34a" : T.accent, fontWeight: 600 }}>{deliveryCharge === 0 ? "Free" : `?${deliveryCharge.toFixed(2)}`}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${T.border}`, marginBottom: 20 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: T.accent }}>?{totalWithDelivery.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                style={{ ...styles.btn(true), width: "100%", justifyContent: "center", padding: "14px" }}
                onClick={handleOrder}
              >
                Place Order
              </button>
              <button
                style={{ ...styles.btn(false), width: "100%", justifyContent: "center", padding: "10px", marginTop: 8 }}
                onClick={() => navigate("catalog")}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin Dashboard Page
  const AdminPage = () => {
    const [adminTab, setAdminTab] = useState("dashboard");
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState({ name: "", price: 0, originalPrice: 0, category: "", brand: "", description: "", image: "", images: [], sizes: [] });
    const [allOrders, setAllOrders] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const templateImportRef = useRef(null);

    const resetProductForm = () => {
      setShowProductForm(false);
      setEditingProduct(null);
      setNewProduct({ name: "", price: 0, originalPrice: 0, category: "", brand: "", description: "", image: "", images: [], sizes: [] });
    };

    const openProductForm = () => {
      setShowProductForm(true);
      setEditingProduct(null);
      setNewProduct({ name: "", price: 0, originalPrice: 0, category: "", brand: "", description: "", image: "", images: [], sizes: [] });
    };

    useEffect(() => {
      const loadAdminData = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        try {
          const ordersRes = await fetch(`${API_BASE}/orders`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const usersRes = await fetch(`${API_BASE}/users`, {
            headers: { "Authorization": `Bearer ${token}` }
          });

          if (ordersRes.status === 401 || usersRes.status === 401) {
            return;
          }

          if (ordersRes.ok) setAllOrders(await ordersRes.json());
          if (usersRes.ok) setAllUsers(await usersRes.json());
        } catch (e) {
          console.log("Admin data load:", e);
          // Fallback data for demo
          setAllUsers([
            { _id: "1", username: "john_doe", email: "john@example.com", role: "user", createdAt: new Date() },
            { _id: "2", username: "jane_smith", email: "jane@example.com", role: "user", createdAt: new Date() }
          ]);
          setAllOrders([
            { _id: "ORD001", userId: "1", total: 219.99, status: "Processing", createdAt: new Date(), items: [{ name: "Storm Rain Jacket", quantity: 1 }] },
            { _id: "ORD002", userId: "2", total: 999, status: "Shipped", createdAt: new Date(), items: [{ name: "Classic T-Shirt", quantity: 2 }] }
          ]);
        }
      };
      loadAdminData();
    }, []);

    const refreshAdminData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        showToast("Error: Please login again");
        return;
      }

      try {
        const ordersRes = await fetch(`${API_BASE}/orders`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const usersRes = await fetch(`${API_BASE}/users`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const productsRes = await fetch(`${API_BASE}/products`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (ordersRes.status === 401 || usersRes.status === 401) {
          showToast("Error: Session expired. Please login again.");
          return;
        }
        
        if (ordersRes.ok) setAllOrders(await ordersRes.json());
        if (usersRes.ok) setAllUsers(await usersRes.json());
        if (productsRes.ok) {
          const apiProducts = await productsRes.json();
          const transformedProducts = apiProducts.map(mapApiProductToUi);
          setProducts(transformedProducts);
        }
        
        showToast("Success: Data refreshed");
      } catch (e) {
        console.log("Admin data refresh:", e);
        showToast("Refresh failed");
      }
    };

    const saveProduct = async () => {
      const primaryImage = newProduct.images?.[0] || newProduct.image || "???";
      const badgeValue = "Limited Stock";
      const normalizedCategory = normalizeCategory(newProduct.category);
      const cleanedSizes = Array.isArray(newProduct.sizes)
        ? [...new Set(newProduct.sizes.map(size => String(size || "").trim()).filter(Boolean))]
        : [];
      const payload = {
        name: newProduct.name || editingProduct?.name || "",
        brand: newProduct.brand || editingProduct?.brand || "",
        category: normalizedCategory,
        price: Number(newProduct.price ?? editingProduct?.price ?? 0),
        originalPrice: Number(newProduct.originalPrice ?? editingProduct?.originalPrice ?? newProduct.price ?? editingProduct?.price ?? 0),
        description: newProduct.description || editingProduct?.description || "",
        image: primaryImage,
        images: Array.isArray(newProduct.images) ? newProduct.images.slice(0, 8) : (primaryImage ? [primaryImage] : []),
        sizes: normalizedCategory === "Accessories" ? [] : cleanedSizes,
        stock: Number(newProduct.stock ?? editingProduct?.stock ?? 0),
        badge: badgeValue
      };
      try {
        const method = editingProduct ? "PUT" : "POST";
        const endpoint = editingProduct ? `${API_BASE}/products/${editingProduct._id || editingProduct.id}` : `${API_BASE}/products`;
        const res = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("authToken")}`
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast(editingProduct ? "Success: Product updated" : "Success: Product added");
          
          // Add product to local state immediately with images
          const newLocalProduct = {
            _id: editingProduct?._id || editingProduct?.id || Date.now(),
            id: editingProduct?.id || editingProduct?._id || Date.now(),
            ...payload,
            images: Array.isArray(payload.images) ? payload.images : []
          };
          
          if (editingProduct) {
            setProducts(products.map(p => p.id === editingProduct.id ? newLocalProduct : p));
          } else {
            setProducts([newLocalProduct, ...products]);
          }
          
          resetProductForm();
          // Reload products if API is available
          try {
            const productsRes = await fetch(`${API_BASE}/products`, {
              headers: { "Authorization": `Bearer ${localStorage.getItem("authToken")}` }
            });
            if (productsRes.ok) {
              const apiProducts = await productsRes.json();
              const transformedProducts = apiProducts.map(mapApiProductToUi);
              setProducts(transformedProducts);
              console.log("Products reloaded and updated");
            }
          } catch (e) { console.log("Product reload failed"); }
        } else {
          let errorMsg = "Unknown error";
          try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
          } catch (parseErr) {
            errorMsg = `HTTP ${res.status}`;
          }
          showToast(`Error: Save failed: ${errorMsg}`);
        }
      } catch (e) {
        showToast("Error: Backend unavailable - product not saved");
        console.error("Save product error:", e);
      }
    };

    const deleteProduct = async (productId) => {
      if (!window.confirm("Delete this product?")) return;
      try {
        const res = await fetch(`${API_BASE}/products/${productId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${localStorage.getItem("authToken")}` }
        });
        if (res.ok) {
          showToast("Success: Product deleted");
          // Reload products list
          try {
            const productsRes = await fetch(`${API_BASE}/products`, {
              headers: { "Authorization": `Bearer ${localStorage.getItem("authToken")}` }
            });
            if (productsRes.ok) {
              console.log("Products reloaded after delete");
            }
          } catch (e) { console.log("Product reload failed"); }
        } else {
          showToast("Error: Delete failed");
        }
      } catch (e) {
        showToast("Error: Delete failed - check backend connection");
        console.error("Delete product error:", e);
      }
    };

    const handleProductPhotoUpload = async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      try {
        const photoDataUrls = await Promise.all(
          files.map((file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }))
        );

        setNewProduct((prev) => {
          const mergedImages = [...(prev.images || []), ...photoDataUrls].slice(0, 8);
          return {
            ...prev,
            images: mergedImages,
            image: mergedImages[0] || prev.image
          };
        });
      } catch (error) {
        window.alert("Photo upload failed");
      }
    };

    const handleTemplateImport = async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      const token = localStorage.getItem("authToken");
      if (!token) {
        showToast("Error: Login required to import templates");
        event.target.value = "";
        return;
      }

      let imported = [];
      for (const file of files) {
        const isJsonFile = (file.type || "").includes("json") || file.name.toLowerCase().endsWith(".json");

        if (isJsonFile) {
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const templates = Array.isArray(parsed) ? parsed : [parsed];
            imported = imported.concat(templates.map((tpl, i) => normalizeTemplate(tpl, i)));
          } catch (error) {
            console.log(`Template JSON skipped for ${file.name}`);
          }
          continue;
        }

        const isMediaFile = (file.type || "").startsWith("image/") || (file.type || "").startsWith("video/") || /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|ogg)$/i.test(file.name);
        if (isMediaFile) {
          if (file.size > MAX_TEMPLATE_MEDIA_BYTES) {
            showToast(`?? ${file.name} is too large. Max 12MB for template media.`);
            continue;
          }

          try {
            const mediaUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const isVideoFile = (file.type || "").startsWith("video/") || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
            imported.push(normalizeTemplate({
              badge: "",
              title: "",
              subtitle: "",
              buttonText: "Explore Collection",
              targetCategory: "All",
              background: "linear-gradient(135deg, #101623 0%, #1e2d44 100%)",
              overlay: "linear-gradient(180deg, rgba(0,0,0,.1) 0%, rgba(0,0,0,.45) 100%)",
              mediaUrl,
              mediaType: isVideoFile ? "video" : "image"
            }));
          } catch (error) {
            console.log(`Template media skipped for ${file.name}`);
          }
        }
      }

      if (!imported.length) {
        window.alert("No valid templates found in selected files");
        return;
      }

      let savedCount = 0;
      for (const template of imported) {
        const payload = {
          badge: "",
          title: "",
          subtitle: "",
          buttonText: "Explore Collection",
          targetCategory: normalizeTemplateCategory(template.targetCategory),
          background: template.background || "",
          overlay: template.overlay || "",
          mediaUrl: template.mediaUrl || "",
          mediaType: template.mediaType || ""
        };

        try {
          const res = await fetch(`${API_BASE}/templates`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            savedCount += 1;
          }
        } catch (error) {
          console.log("Template import save skipped");
        }
      }

      if (savedCount > 0) {
        try {
          const refreshed = await fetch(`${API_BASE}/templates`);
          if (refreshed.ok) {
            const dbTemplates = await refreshed.json();
            setHeroTemplates(normalizeTemplateList(dbTemplates));
          }
        } catch (error) {
          console.log("Template refresh skipped");
        }
      }

      if (savedCount === imported.length) {
        showToast(`Success: ${savedCount} template(s) imported`);
      } else {
        showToast(`Saved ${savedCount}/${imported.length} template(s)`);
      }

      event.target.value = "";
    };

    const saveTemplate = () => {
      const persistTemplates = async () => {
        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            showToast("Error: Login required to save templates");
            return;
          }

          let savedCount = 0;
          const failedTemplates = [];

          for (const template of heroTemplates) {
            if ((template.mediaUrl || "").startsWith("data:") && (template.mediaUrl || "").length > MAX_TEMPLATE_MEDIA_BYTES * 1.37) {
              failedTemplates.push(`Template skipped: media too large`);
              continue;
            }

            const payload = {
              badge: "",
              title: "",
              subtitle: "",
              buttonText: "Explore Collection",
              targetCategory: normalizeTemplateCategory(template.targetCategory),
              background: template.background || "",
              overlay: template.overlay || "",
              mediaUrl: template.mediaUrl || "",
              mediaType: template.mediaType || ""
            };

            const templateId = template._id || template.id;
            const hasMongoId = /^[a-f\d]{24}$/i.test(String(templateId || ""));

            const endpoint = hasMongoId
              ? `${API_BASE}/templates/${templateId}`
              : `${API_BASE}/templates`;
            const method = hasMongoId ? "PUT" : "POST";

            const res = await fetch(endpoint, {
              method,
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });

            if (!res.ok) {
              let errorMessage = `Save failed (${res.status})`;
              try {
                const errorData = await res.json();
                errorMessage = errorData?.msg || errorData?.message || errorMessage;
              } catch (error) {
                // ignore parse errors and keep status based message
              }
              failedTemplates.push(errorMessage);
              continue;
            }

            await res.json();
            savedCount += 1;
          }

          if (savedCount === 0) {
            const firstError = failedTemplates[0] || "No templates could be saved";
            throw new Error(firstError);
          }

          const refreshed = await fetch(`${API_BASE}/templates`);
          if (!refreshed.ok) {
            throw new Error("Templates saved but refresh failed");
          }

          const refreshedTemplates = await refreshed.json();
          const normalized = Array.isArray(refreshedTemplates)
            ? normalizeTemplateList(refreshedTemplates)
            : [];

          setHeroTemplates(normalized.length ? normalized : normalizeTemplateList(heroTemplates));

          if (failedTemplates.length > 0) {
            showToast(`Saved ${savedCount} template(s). ${failedTemplates.length} failed.`);
          } else {
            showToast(`Success: ${savedCount} template(s) saved permanently`);
          }
        } catch (error) {
          showToast(`?? ${error.message || "DB save failed"}`);
        }
      };

      persistTemplates();
    };

    const removeTemplate = (templateId) => {
      const removeAndSync = async () => {
        const next = heroTemplates.filter((template) => String(template.id) !== String(templateId) && String(template._id) !== String(templateId));

        try {
          if (/^[a-f\d]{24}$/i.test(String(templateId || ""))) {
            const response = await fetch(`${API_BASE}/templates/${templateId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${localStorage.getItem("authToken")}` }
            });
            if (!response.ok) {
              throw new Error("Delete failed");
            }

            const refreshed = await fetch(`${API_BASE}/templates`);
            if (refreshed.ok) {
              const dbTemplates = await refreshed.json();
              const normalized = Array.isArray(dbTemplates)
                ? normalizeTemplateList(dbTemplates)
                : [];
              setHeroTemplates(normalized.length ? normalized : next);
            }
          } else {
            showToast("Error: Template not found in DB");
          }
        } catch (error) {
          showToast("Error: Template delete failed");
          console.log("Template delete API skipped");
        }
      };

      removeAndSync();
    };

    const tabStyle = (isActive) => ({
      padding: "8px 16px",
      borderBottom: isActive ? `3px solid ${T.accent}` : `1px solid ${T.border}`,
      background: "transparent",
      color: isActive ? T.accent : T.muted,
      fontWeight: isActive ? 700 : 500,
      cursor: "pointer",
      transition: "all .2s"
    });

    const hasProductDraft = Boolean(
      newProduct.name ||
      newProduct.brand ||
      newProduct.category ||
      newProduct.description ||
      (newProduct.sizes && newProduct.sizes.length) ||
      (newProduct.price && Number(newProduct.price) > 0) ||
      (newProduct.originalPrice && Number(newProduct.originalPrice) > 0) ||
      (newProduct.images && newProduct.images.length)
    );

    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: pagePadding }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, margin: 0, color: T.accent }}>?? Admin Panel</h1>
            <p style={{ margin: "4px 0 0", color: T.muted, fontSize: 14 }}>Manage your e-commerce platform</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button style={{ ...styles.btn(false), padding: "8px 16px" }} onClick={refreshAdminData}>
              <span style={{ marginRight: 4 }}>??</span>Refresh
            </button>
            <button style={{ ...styles.btn(false), padding: "8px 16px" }} onClick={() => navigate("home")}>? Back to Store</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 32, overflowX: "auto" }}>
          {[
            { key: "dashboard", label: "Dashboard", icon: "??" },
            { key: "products", label: "Products", icon: "??" },
            { key: "templates", label: "Templates", icon: "??" },
            { key: "orders", label: "Orders", icon: "??" },
            { key: "users", label: "Users", icon: "??" }
          ].map(({ key, label, icon }) => (
            <button key={key} style={tabStyle(adminTab === key)} onClick={() => setAdminTab(key)}>
              <span style={{ marginRight: 8 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {adminTab === "dashboard" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Dashboard Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 32 }}>
              <div style={{ background: `linear-gradient(135deg, ${T.card} 0%, ${T.input} 100%)`, padding: 24, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>??</div>
                  <div>
                    <div style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Products</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: T.accent, marginTop: 4 }}>{products.length}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: T.muted }}>Active products in catalog</div>
              </div>

              <div style={{ background: `linear-gradient(135deg, ${T.card} 0%, ${T.input} 100%)`, padding: 24, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>??</div>
                  <div>
                    <div style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Orders</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#10b981", marginTop: 4 }}>{allOrders.length}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: T.muted }}>Orders this month</div>
              </div>

              <div style={{ background: `linear-gradient(135deg, ${T.card} 0%, ${T.input} 100%)`, padding: 24, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>??</div>
                  <div>
                    <div style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Users</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6", marginTop: 4 }}>{allUsers.length}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: T.muted }}>Registered customers</div>
              </div>

              <div style={{ background: `linear-gradient(135deg, ${T.card} 0%, ${T.input} 100%)`, padding: 24, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>??</div>
                  <div>
                    <div style={{ fontSize: 12, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Revenue</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b", marginTop: 4 }}>${(allOrders.reduce((sum, o) => sum + (o.total || 0), 0)).toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: T.muted }}>Total earnings</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr", gap: 24 }}>
              <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recent Orders</h3>
                {allOrders.slice(0, 5).length === 0 ? (
                  <div style={{ color: T.muted, textAlign: "center", padding: 20 }}>No recent orders</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {allOrders.slice(0, 5).map(order => (
                      <div key={order._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: T.input, borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>#{order._id?.slice(-6)}</div>
                          <div style={{ fontSize: 12, color: T.muted }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 600 }}>${order.total?.toFixed(2)}</div>
                          <div style={{ fontSize: 12, color: getStatusColor(order.status), fontWeight: 500 }}>{order.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Top Products</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {products.slice(0, 5).map(product => (
                    <div key={product.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: T.input, borderRadius: 8 }}>
                      <div style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>{renderProductMedia(product.image, 34)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>{product.category}</div>
                      </div>
                      <div style={{ fontWeight: 600, color: T.accent }}>${product.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {adminTab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0, marginBottom: 32 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Product Management</h2>
                <p style={{ margin: "4px 0 0", color: T.muted, fontSize: 14 }}>Manage your product catalog</p>
              </div>
              <button style={{ ...styles.btn(true), padding: "12px 24px", fontSize: 14 }} onClick={openProductForm}>
                <span style={{ marginRight: 8 }}>?</span>Add Product
              </button>
            </div>

            {(showProductForm || editingProduct || hasProductDraft) && (
              <div style={{ background: T.card, padding: 32, borderRadius: 16, marginBottom: 32, border: `1px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ fontSize: 24 }}>{editingProduct ? "??" : "?"}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{editingProduct ? "Edit Product" : "Add New Product"}</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
                  <input style={styles.input} placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))} />
                  <input style={styles.input} placeholder="Brand" value={newProduct.brand} onChange={e => setNewProduct(prev => ({ ...prev, brand: e.target.value }))} />
                  <input style={styles.input} placeholder="Price ($)" type="number" step="0.01" value={newProduct.price || ""} onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 }))} />
                  <input style={styles.input} placeholder="Original Price ($)" type="number" step="0.01" value={newProduct.originalPrice || ""} onChange={e => setNewProduct(prev => ({ ...prev, originalPrice: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 }))} />
                  <select style={styles.input} value={newProduct.category} onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="">Select Category</option>
                    {CATEGORIES.filter(c => c !== "All").map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <input
                    style={styles.input}
                    placeholder={normalizeCategory(newProduct.category) === "Accessories" ? "Sizes not required for accessories" : "Sizes (comma separated, e.g. S,M,L,XL)"}
                    value={normalizeCategory(newProduct.category) === "Accessories" ? "" : (newProduct.sizes || []).join(",")}
                    disabled={normalizeCategory(newProduct.category) === "Accessories"}
                    onChange={e => setNewProduct(prev => ({
                      ...prev,
                      sizes: e.target.value.split(",").map(size => size.trim()).filter(Boolean)
                    }))}
                  />
                  <input style={styles.input} type="file" multiple accept=".jpg,.jpeg,.png,.mp4,.webm,.ogg,video/*,image/*" onChange={handleProductPhotoUpload} />
                  <textarea style={{...styles.input, gridColumn: "1 / -1", minHeight: 100}} placeholder="Product Description" value={newProduct.description} onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))} />
                  <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))", gap: 10 }}>
                    {(newProduct.images || []).map((photo, index) => (
                      <div key={`${photo}-${index}`} style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
                        {isVideoValue(photo) ? (
                          <video src={photo} muted playsInline loop autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <img src={photo} alt={`preview-${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                        <button
                          type="button"
                          onClick={() => setNewProduct((prev) => {
                            const nextImages = (prev.images || []).filter((_, idx) => idx !== index);
                            return { ...prev, images: nextImages, image: nextImages[0] || "" };
                          })}
                          style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(220,38,38,.95)", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          �
                        </button>
                      </div>
                    ))}
                    {!newProduct.images?.length && (
                      <div style={{ gridColumn: "1 / -1", fontSize: 12, color: T.muted }}>Upload multiple photos. First photo will be used as product cover.</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                  <button style={{...styles.btn(false), background: T.border}} onClick={resetProductForm}>Cancel</button>
                  <button style={styles.btn(true)} onClick={saveProduct}>
                    <span style={{ marginRight: 8 }}>{editingProduct ? "??" : "?"}</span>
                    {editingProduct ? "Update Product" : "Save Product"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${T.border}`, background: T.input }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Product Catalog ({products.length} products)</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.input }}>
                      <th style={{ padding: 16, textAlign: "left", fontWeight: 600 }}>Product</th>
                      <th style={{ padding: 16, textAlign: "left", fontWeight: 600 }}>Price</th>
                      <th style={{ padding: 16, textAlign: "left", fontWeight: 600 }}>Category</th>
                      <th style={{ padding: 16, textAlign: "left", fontWeight: 600 }}>Availability</th>
                      <th style={{ padding: 16, textAlign: "left", fontWeight: 600 }}>Sizes</th>
                      <th style={{ padding: 16, textAlign: "center", fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} style={{ borderBottom: `1px solid ${T.border}`, hover: { background: T.input } }}>
                        <td style={{ padding: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{renderProductMedia(product.image, 38)}</div>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>{product.name}</div>
                              <div style={{ fontSize: 12, color: T.muted }}>{product.brand}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: 16 }}>
                          <div style={{ fontWeight: 600, color: T.accent }}>${product.price}</div>
                          {product.originalPrice && <div style={{ fontSize: 12, color: T.muted, textDecoration: "line-through" }}>${product.originalPrice}</div>}
                        </td>
                        <td style={{ padding: 16 }}>
                          <span style={{ background: T.input, padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>{product.category}</span>
                        </td>
                        <td style={{ padding: 16 }}>
                          <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>Limited Stock</span>
                        </td>
                        <td style={{ padding: 16 }}>
                          <span style={{ fontSize: 12, color: T.muted }}>
                            {(product.sizes && product.sizes.length) ? product.sizes.join(", ") : "-"}
                          </span>
                        </td>
                        <td style={{ padding: 16, textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button style={{...styles.btn(true), padding: "6px 12px", fontSize: 12}} onClick={() => {
                              setShowProductForm(true);
                              setEditingProduct(product);
                              setNewProduct({
                                ...product,
                                sizes: Array.isArray(product.sizes) ? product.sizes : [],
                                images: Array.isArray(product.images) && product.images.length
                                  ? product.images
                                  : ((isImageValue(product.image) || isVideoValue(product.image)) ? [product.image] : [])
                              });
                            }}>
                              <span style={{ marginRight: 4 }}>??</span>Edit
                            </button>
                            <button style={{...styles.btn(false), padding: "6px 12px", fontSize: 12, background: "#e74c3c", color: "#fff"}} onClick={() => deleteProduct(product._id || product.id)}>
                              <span style={{ marginRight: 4 }}>???</span>Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {adminTab === "templates" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 0, marginBottom: 24 }}>
              <h2>Template Import</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  ref={templateImportRef}
                  type="file"
                  accept="application/json,.json,.jpg,.jpeg,.png,.mp4,.webm,.ogg,image/*,video/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleTemplateImport}
                />
                <button style={styles.btn(true)} onClick={() => templateImportRef.current?.click()}>+ Add Template</button>
                <button style={styles.btn(false)} onClick={saveTemplate}>Save Templates</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {heroTemplates.map(template => (
                <div key={template.id} style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                  <div style={{ background: template.background, height: 180, position: "relative", overflow: "hidden" }}>
                    {template.mediaUrl && template.mediaType === "image" && (
                      <img src={template.mediaUrl} alt="template" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", background: "#0f172a" }} />
                    )}
                    {template.mediaUrl && template.mediaType === "video" && (
                      <video src={template.mediaUrl} muted playsInline autoPlay loop style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", background: "#0f172a" }} />
                    )}
                    <div style={{ position: "absolute", inset: 0, background: template.overlay }}></div>
                    <div style={{ position: "absolute", left: 10, bottom: 10, right: 90, zIndex: 2 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#fff", marginBottom: 4, fontWeight: 700 }}>Explore category</label>
                      <select
                        value={normalizeTemplateCategory(template.targetCategory)}
                        onChange={async (e) => {
                          const nextCategory = normalizeTemplateCategory(e.target.value);
                          const token = localStorage.getItem("authToken");
                          if (!token) {
                            showToast("Error: Login required");
                            return;
                          }

                          const templateId = template._id || template.id;
                          if (!/^[a-f\d]{24}$/i.test(String(templateId || ""))) {
                            showToast("Error: Template not synced to DB");
                            return;
                          }

                          const payload = {
                            badge: "",
                            title: "",
                            subtitle: "",
                            buttonText: "Explore Collection",
                            targetCategory: nextCategory,
                            background: template.background || "",
                            overlay: template.overlay || "",
                            mediaUrl: template.mediaUrl || "",
                            mediaType: template.mediaType || ""
                          };

                          try {
                            const res = await fetch(`${API_BASE}/templates/${templateId}`, {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                              },
                              body: JSON.stringify(payload)
                            });

                            if (!res.ok) {
                              throw new Error("Update failed");
                            }

                            setHeroTemplates((prev) => prev.map((item) => (
                              String(item.id) === String(template.id)
                                ? { ...item, targetCategory: nextCategory, buttonText: "Explore Collection", title: "", subtitle: "", badge: "" }
                                : item
                            )));
                          } catch (error) {
                            showToast("Error: Category update failed");
                          }
                        }}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,.55)", background: "rgba(15,23,42,.62)", color: "#fff", fontSize: 12, fontWeight: 600 }}
                      >
                        {TEMPLATE_TARGET_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <button style={{ ...styles.btn(false), position: "absolute", right: 10, bottom: 10, background: "#e74c3c", color: "#fff", padding: "6px 10px", fontSize: 12 }} onClick={() => removeTemplate(template.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === "orders" && (
          <div>
            <h2>All Orders</h2>
            {allOrders.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, marginTop: 40 }}>No orders yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {allOrders.map(order => (
                  <div key={order._id} style={{ background: T.card, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                      <div>
                        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>#{order._id?.slice(-6).toUpperCase()}</h3>
                        <p style={{ margin: "4px 0", fontSize: 13, color: T.muted }}>Customer: {order.name} | Phone: {order.mobile}</p>
                        <p style={{ margin: "4px 0", fontSize: 13, color: T.muted }}>Address: {order.address}</p>
                        <p style={{ margin: "4px 0", fontSize: 12, color: T.muted }}>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.accent, marginBottom: 12 }}>?{order.total}</div>
                        <select 
                          value={order.status} 
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            fetch(`${API_BASE}/orders/${order._id}/status`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                              },
                              body: JSON.stringify({ status: newStatus })
                            }).then(res => {
                              if (res.ok) {
                                showToast('Success: Status updated');
                                refreshAdminData();
                              }
                            }).catch(err => {
                              showToast('Error: Failed to update');
                            });
                          }}
                          style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.input, color: T.text, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ background: T.input, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: T.muted }}>Items:</p>
                      {order.items?.map((item, idx) => (
                        <div key={idx} style={{ fontSize: 13, padding: "4px 0" }}>
                          � {item.name} x{item.qty || 1} - ?{item.price}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {adminTab === "users" && (
          <div>
            <h2>All Users</h2>
            {allUsers.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, marginTop: 40 }}>No users found</div>
            ) : (
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", marginTop: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.input }}>
                      <th style={{ padding: 12, textAlign: "left" }}>Name</th>
                      <th style={{ padding: 12, textAlign: "left" }}>Email</th>
                      <th style={{ padding: 12, textAlign: "left" }}>Role</th>
                      <th style={{ padding: 12, textAlign: "left" }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(userData => (
                      <tr key={userData._id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: 12 }}>{userData.username || userData.name}</td>
                        <td style={{ padding: 12 }}>{userData.email}</td>
                        <td style={{ padding: 12 }}><span style={{ background: userData.role === "admin" ? T.accent : T.border, color: userData.role === "admin" ? T.bg : T.text, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{userData.role || "user"}</span></td>
                        <td style={{ padding: 12 }}>{new Date(userData.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.app}>
      <Navbar />
      {searchOpen && <SearchModal />}
      {cartOpen && <CartPanel />}
      <main>
        {page === "home" && <HomePage />}
        {page === "catalog" && <CatalogPage />}
        {page === "product" && selectedProduct && <ProductDetailPage />}
        {page === "checkout" && <CheckoutPage />}
        {page === "login" && !loggedIn && <LoginPage T={T} styles={styles} navigate={navigate} loginUser={loginUser} darkMode={darkMode} validateEmail={validateEmail} validatePhone={validatePhone} />}
        {page === "signup" && <SignupPage T={T} styles={styles} navigate={navigate} signupUser={signupUser} showToast={showToast} darkMode={darkMode} />}
        {page === "profile" && loggedIn && <ProfilePage T={T} styles={styles} navigate={navigate} user={user} setUser={setUser} logoutUser={logoutUser} darkMode={darkMode} showToast={showToast} products={products} />}
        {page === "admin" && loggedIn && (user?.role === "admin" || user?.email === "admin@naananaa.local") && <AdminPage />}
      </main>
      <Toast show={toast.show} message={toast.msg} onClose={() => setToast({ show: false, msg: "" })} />
    </div>
  );
}











