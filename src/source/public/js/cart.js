const cartList = document.querySelector(".cart .product-list");
const cartBtn = document.querySelector(".header .cart-icon");
const cartScreen = document.querySelector(".cart");
const cartCloseBtn = document.querySelector(".cart .cart-close-btn");
const cartSlider = document.querySelector(".cart .cart-slider");
// const { formatCurrency } = require('../../../helpers/handlebars');

// Turn on the cart screen
const turnOnCartScreen = () => {
  cartScreen.classList.add("d-flex");
  setTimeout(() => {
    cartSlider.classList.add("slide");
  }, 150);
};

// Turn off the cart screen
const turnOffCartScreen = () => {
  cartSlider.classList.remove("slide");
  setTimeout(() => {
    cartScreen.classList.remove("d-flex");
  }, 150);
};

//  ================ Add event listener  ================
// For the cart close button in the cart slider
cartCloseBtn.addEventListener("click", turnOffCartScreen);

// For the overlay on the left of the cart slider
cartScreen.addEventListener("click", turnOffCartScreen);

// For stopping bubbling from the child elements in the cart slider
cartSlider.addEventListener("click", (e) => {
  e.stopPropagation();
});

// const formatCurrency = (price) => {
//   return Number(price).toLocaleString("it-IT", { style: "currency", currency: "VND" });
// }

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}


async function buildCartScreen(products) {
  // Tạo giao diện cho Cart screen
  cartList.innerHTML = "";
  let totalPay = 0;
  products.forEach((product) => {
    let formattedPrice = formatCurrency(product.price);
    cartList.insertAdjacentHTML(
      "beforeend",
      `<li>
      <a class="product-item row mx-0 gx-0" href="/product/specific-product/${
        product._id
      }">
        <div class="product-img col-2 d-flex align-items-center">
          <img src="${product.image}" alt="product image" />
        </div>
        <div class="col-9">
          <p class="product-title">${product.name}</p>
          <p class="product-quantity-price">
            <span class="product-quantity">${product.quantity}</span>x
            <span class="product-price">
              ${formattedPrice}
            </span>
          </p>
        </div>
        <i class="fa-thin fa-circle-xmark col-1 d-flex align-items-center product-close-btn" onclick="deleteFromCart('${
          product._id
        }')"></i>
      </a>
    </li>`
    );
    totalPay += product.quantity * product.price;
  });
  if (cartList.childElementCount != 0) {
    if (cartList.nextElementSibling) {
      cartList.nextElementSibling.remove();
      cartList.nextElementSibling.remove();
    }
    let formattedTotalPrice = formatCurrency(totalPay);
    cartList.parentElement.insertAdjacentHTML(
      "beforeend",
      `
      <p class="cart-price text-capitalize text-center">
        Total payment:
        <span>${formattedTotalPrice}</span>
      </p>
      <a class="btn text-uppercase" href="/order/payment-for-cart" role="button">Pay for cart</a>
    `
    );
  } else {
    const cartPrice = document.querySelector(".cart .cart-price");
    const cartPayBtn = document.querySelector(".cart a.btn");
    cartList.innerHTML = `
    <div class="mt-5" style="display: flex; flex-direction: column; align-items: center;">
      <img src="/img/empty_cart.png" alt="Empty cart" style="width: 50%; height: auto;"/>
      <p class="cart-empty-text text-center" style="font-weight: bold; font-size: 3rem;">Empty cart</p>
    </div>
    `;
    cartPrice?.classList.add("d-none");
    cartPayBtn?.classList.add("d-none");
  }
  const productCloseBtns = document.querySelectorAll(
    ".cart .product-close-btn"
  );
  productCloseBtns?.forEach((productCloseBtn) => {
    productCloseBtn.addEventListener("click", (e) => {
      e.preventDefault();
    });
  });
}

// API
async function getCart() {
  try {
    let res = await fetch("/product/cart", {
      method: "GET",
    });
    // Nhận về các sản phẩm nằm trong session
    let products = await res.json();
    await buildCartScreen(products);
    turnOnCartScreen();
  } catch (err) {}
}

async function deleteFromCart(id) {
  try {
    let res = await fetch(`/product/cart/${id}`, {
      method: "DELETE",
    });
    // Nhận về các sản phẩm nằm trong session
    let products = await res.json();
    buildCartScreen(products);

    // Update cartNumber to represent the count of unique products
    const cartNumber = products.length; // This now counts the number of unique product entries

    document.getElementById("lblCartCount").innerText = `${cartNumber}`;
  } catch (err) {
    console.log(err);
  }
}
