/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsContainer = document.getElementById(
  "selectedProductsContainer"
);
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectedBtn = document.getElementById("clearSelected");

/* Placeholder */
productsContainer.innerHTML =
  "<div class='placeholder-message'>Select a category to view products</div>";

/* Load product data */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* State */
let selectedProducts =
  JSON.parse(localStorage.getItem("selectedProducts")) || [];
let currentFilteredProducts = [];
let allProducts = [];

let chatMessages = [
  {
    role: "system",
    content:
      "You are a helpful assistant for L’Oréal. Only answer questions related to L’Oréal products, beauty routines, skincare, haircare, makeup, and product recommendations. If a question is not about L’Oréal or beauty routines, politely explain that you can only help with L’Oréal products and routines.",
  },
];

/* Save to localStorage */
function saveSelectedProductsToStorage() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Update Selected Products section */
function updateSelectedProductsSection() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      "<div class='placeholder-message'>No products selected.</div>";
    return;
  }

  selectedProductsList.innerHTML = `
    <div class="products-grid">
      ${selectedProducts
        .map((name) => {
          const product = allProducts.find((p) => p.name === name) || {
            name,
            brand: "",
            image: "",
          };
          return `
          <div class="product-card">
            <img src="${product.image}" alt="${product.name}">
            <div class="product-info">
              <h3>${product.name}</h3>
              <p>${product.brand}</p>
              <button class="remove-selected" data-product-name="${product.name}">Remove</button>
            </div>
          </div>`;
        })
        .join("")}
    </div>
  `;

  selectedProductsList.querySelectorAll(".remove-selected").forEach((btn) => {
    const productName = btn.getAttribute("data-product-name");
    btn.addEventListener("click", () => {
      selectedProducts = selectedProducts.filter((p) => p !== productName);
      saveSelectedProductsToStorage();
      displayProducts(currentFilteredProducts);
      updateSelectedProductsSection();
    });
  });
}

/* Display Product Cards */
function displayProducts(products) {
  currentFilteredProducts = products;

  productsContainer.innerHTML = `
    <div class="products-grid">
      ${products
        .map(
          (product) => `
        <div class="product-card${
          selectedProducts.includes(product.name) ? " selected" : ""
        }" data-product-name="${product.name}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>
          <div class="product-description-overlay">${product.description}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    const name = card.getAttribute("data-product-name");
    card.addEventListener("click", () => {
      if (selectedProducts.includes(name)) {
        selectedProducts = selectedProducts.filter((p) => p !== name);
      } else {
        selectedProducts.push(name);
      }
      saveSelectedProductsToStorage();
      displayProducts(currentFilteredProducts);
      updateSelectedProductsSection();
    });
  });

  updateSelectedProductsSection();
}

/* Load products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  allProducts = products;
  const selectedCategory = e.target.value;
  const filtered = products.filter((p) => p.category === selectedCategory);
  displayProducts(filtered);
});

/* Restore products on page load */
window.addEventListener("DOMContentLoaded", async () => {
  const products = await loadProducts();
  allProducts = products;

  if (selectedProducts.length > 0) {
    const preSelected = allProducts.filter((p) =>
      selectedProducts.includes(p.name)
    );
    displayProducts(preSelected);
    updateSelectedProductsSection();
  }
});

/* Chat message submission */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = chatForm.querySelector("input").value;
  chatWindow.innerHTML += `<div class="chat-message user"><strong>You:</strong> ${input}</div>`;
  chatWindow.innerHTML += `<div class="chat-message bot">Thinking...</div>`;

  chatMessages.push({ role: "user", content: input });

  try {
    const res = await fetch("https://loreal-chatbot.audreycruz.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o", messages: chatMessages }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, no response.";
    chatMessages.push({ role: "assistant", content: reply });

    chatWindow.innerHTML = chatWindow.innerHTML.replace(`Thinking...`, "");
    chatWindow.innerHTML += `<div class="chat-message bot"><strong>L'Oréal Assistant:</strong>${marked.parse(
      reply
    )}</div>`;
    chatForm.querySelector("input").value = "";
  } catch {
    chatWindow.innerHTML += `<div class="chat-message bot">Error connecting to chatbot.</div>`;
  }
});

/* Generate routine */
generateRoutineBtn.addEventListener("click", async () => {
  const selectedDetails = selectedProducts
    .map((name) => allProducts.find((p) => p.name === name))
    .filter(Boolean);
  if (selectedDetails.length === 0) {
    chatWindow.innerHTML += `<div class="chat-message bot">Please select at least one product to generate a routine.</div>`;
    return;
  }

  chatWindow.innerHTML += `<div class="chat-message bot">Generating your routine...</div>`;

  chatMessages.push({
    role: "user",
    content: `Here are the selected products as JSON:\n${JSON.stringify(
      selectedDetails,
      null,
      2
    )}\nPlease generate a step-by-step routine using these products.`,
  });

  try {
    const res = await fetch("https://loreal-chatbot.audreycruz.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o", messages: chatMessages }),
    });
    const data = await res.json();
    const routine =
      data.choices?.[0]?.message?.content || "Sorry, no routine generated.";
    chatMessages.push({ role: "assistant", content: routine });

    chatWindow.innerHTML = chatWindow.innerHTML.replace(
      `Generating your routine...`,
      ""
    );
    chatWindow.innerHTML += `<div class="chat-message bot"><strong>Your L'Oréal Routine:</strong>${marked.parse(
      routine
    )}</div>`;
  } catch {
    chatWindow.innerHTML += `<div class="chat-message bot">Error generating routine.</div>`;
  }
});

/* Clear All Button */
clearSelectedBtn.addEventListener("click", () => {
  selectedProducts = [];
  localStorage.removeItem("selectedProducts");
  displayProducts(currentFilteredProducts);
  updateSelectedProductsSection();
});
