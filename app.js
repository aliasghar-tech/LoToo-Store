const app = document.getElementById("app") || document.getElementById("app");
const cartCountEl = document.getElementById("cart-count");
const popupContainer = document.getElementById("popup-container");

let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  const totalCount = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  if (cartCountEl) cartCountEl.textContent = totalCount;
}
saveCart();

function showPopup(text, timeout = 1700) {
  const node = document.createElement("div");
  node.className = "popup";
  node.textContent = text;
  popupContainer.appendChild(node);

  requestAnimationFrame(() => node.classList.add("show"));

  setTimeout(() => {
    node.classList.remove("show");
    setTimeout(() => node.remove(), 350);
  }, timeout);
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);

async function router() {
  const route = location.hash || "#/";
  if (route === "#/" || route === "") await renderHome();
  else if (route === "#/cart") renderCart();
  else if (route === "#/checkout") renderCheckout();
}

async function renderHome() {
  const container = document.getElementById("app");
  container.innerHTML = `
    <div class="filter-bar">
      <select id="category-filter"><option value="all">All Categories</option></select>
      <select id="price-filter">
        <option value="10000">All Prices</option>
        <option value="100">Under $100</option>
        <option value="50">Under $50</option>
      </select>
      <select id="sort-filter">
        <option value="default">Sort: Default</option>
        <option value="low">Price ↑</option>
        <option value="high">Price ↓</option>
      </select>
    </div>
    <div id="products" class="products-container">Loading...</div>
  `;

  if (!products.length) {
    const res = await fetch("https://fakestoreapi.com/products").catch(
      () => null
    );
    products = res ? await res.json() : [];
  }

  const cats = [...new Set(products.map((p) => p.category))];
  const catSelect = document.getElementById("category-filter");
  cats.forEach((c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c.charAt(0).toUpperCase() + c.slice(1);
    catSelect.appendChild(o);
  });

  document
    .getElementById("price-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("sort-filter")
    .addEventListener("change", applyFilters);
  catSelect.addEventListener("change", applyFilters);

  displayProducts(products);
}

function applyFilters() {
  const cat = document.getElementById("category-filter").value;
  const maxPrice = parseFloat(document.getElementById("price-filter").value);
  const sort = document.getElementById("sort-filter").value;
  let list = products.filter((p) => p.price <= maxPrice);
  if (cat !== "all") list = list.filter((p) => p.category === cat);
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  else if (sort === "high") list.sort((a, b) => b.price - a.price);
  displayProducts(list);
}

function displayProducts(list) {
  const el = document.getElementById("products");
  if (!list || !list.length) {
    el.innerHTML = '<p style="padding:22px">No products found.</p>';
    return;
  }
  el.innerHTML = list
    .map(
      (p) => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-top">
        <img src="${p.image}" alt="${escapeHtml(p.title)}">
        <h3 title="${escapeHtml(p.title)}">${p.title}</h3>
        <div class="price">$${p.price.toFixed(2)}</div>
      </div>
      <div class="card-footer">
        <button class="add-btn" data-id="${
          p.id
        }"><i class="fas fa-cart-plus"></i> Add to cart</button>
        <button class="btn-ghost" onclick="location.hash='#/cart'">View cart</button>
      </div>
    </div>
  `
    )
    .join("");

  document
    .getElementById("products")
    .querySelectorAll(".add-btn")
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = Number(btn.dataset.id);
        addToCart(id);
      });
    });
}

function addToCart(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  const exists = cart.find((i) => i.id === id);
  if (exists) exists.quantity = (exists.quantity || 0) + 1;
  else
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  saveCart();
  showPopup("Added to cart");
}

function renderCart() {
  const container = document.getElementById("app");
  container.innerHTML = `
    <div class="cart-container">
      <h2 style="margin-bottom:12px">🛒 Your Cart</h2>
      <div id="cartItems"></div>
      <div class="total" id="cartTotal"></div>
      <div style="margin-top:14px">
        <button id="goCheckout">Proceed to Checkout</button>
      </div>
    </div>
  `;
  updateCartUI();

  document.getElementById("cartItems").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const row = e.target.closest(".cart-item");
    if (!row) return;
    const id = Number(row.dataset.id);
    if (btn.classList.contains("qty-decrease")) {
      changeQty(id, -1);
    } else if (btn.classList.contains("qty-increase")) {
      changeQty(id, +1);
    } else if (btn.classList.contains("delete-btn")) {
      removeItem(id);
    }
  });

  document
    .getElementById("goCheckout")
    .addEventListener("click", () => (location.hash = "#/checkout"));
}

function updateCartUI() {
  const wrap = document.getElementById("cartItems");
  if (!wrap) return;
  if (cart.length === 0) {
    wrap.innerHTML = "<p>Your cart is empty</p>";
    document.getElementById("cartTotal").textContent = "";
    return;
  }

  wrap.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${escapeHtml(item.title)}">
      <div class="cart-item-info">
        <h4 title="${escapeHtml(item.title)}">${item.title}</h4>
        <div class="unit">Unit: $${item.price.toFixed(2)}</div>
        <div class="subtotal">Subtotal: $${(item.price * item.quantity).toFixed(
          2
        )}</div>
      </div>

      <div class="cart-actions">
        <div class="quantity-controls" aria-label="Quantity controls">
          <button class="qty-decrease" aria-label="Decrease">−</button>
          <span class="qty-count">${item.quantity}</span>
          <button class="qty-increase" aria-label="Increase">+</button>
        </div>
        <button class="delete-btn" aria-label="Remove item">Remove</button>
      </div>
    </div>
  `
    )
    .join("");

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  document.getElementById("cartTotal").textContent = `Total: $${total.toFixed(
    2
  )}`;
  saveCart();
}

function changeQty(id, delta) {
  const idx = cart.findIndex((i) => i.id === id);
  if (idx === -1) return;
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) {
    cart.splice(idx, 1);
  }
  saveCart();

  updateCartUI();
}

function removeItem(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  updateCartUI();
  showPopup("Item removed", 1300);
}

function renderCheckout() {
  if (cart.length === 0) {
    const container = document.getElementById("app");
    container.innerHTML = `<div style="padding:30px"><h2>Your cart is empty</h2><p>Add products first.</p></div>`;
    return;
  }
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2);
  const container = document.getElementById("app");
  container.innerHTML = `
    <div class="checkout-container">
      <h2>Checkout</h2>
      <form id="checkout-form">
        <input required name="name" placeholder="Full name" />
        <input required name="email" type="email" placeholder="Email" />
        <input required name="address" placeholder="Address" />
        <select name="payment" required>
          <option value="">Select payment type</option>
          <option value="card">Credit / Debit Card</option>
          <option value="paypal">PayPal</option>
          <option value="cod">Cash on Delivery</option>
        </select>
        <div style="margin-top:12px">Order total: <strong>$${total}</strong></div>
        <div style="margin-top:14px">
          <button type="submit">Place Order</button>
        </div>
      </form>
    </div>
  `;
  document.getElementById("checkout-form").addEventListener("submit", (e) => {
    e.preventDefault();
    showPopup("Order placed! 🎉", 1900);
    cart = [];
    saveCart();
    setTimeout(() => (location.hash = "#/"), 900);
  });
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        s
      ])
  );
}

(async function preload() {
  try {
    const res = await fetch("https://fakestoreapi.com/products");
    products = await res.json();
  } catch (e) {
    products = [];
  }
})();
