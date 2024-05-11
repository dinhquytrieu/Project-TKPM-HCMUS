document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.querySelector('input[type="search"]');
    const productList = document.querySelector('.list-products');
    const pagination = document.querySelector(".pagination");
    const statusFilter = document.getElementById('statusFilter');

    // Handle input change for dynamic searching
    // searchInput.addEventListener('input', function () {
    //     // console.log('Search:', searchInput.value);
    //     fetchAndUpdateProducts(1); // Always revert to page 1 for new searches
    // });
    searchInput.addEventListener('input', debounce(function () {
        fetchAndUpdateProducts(1); // Always revert to page 1 for new searches
    }, 250)); // Debounce to limit requests
    // Debounce function to limit the rate of invoking the search
    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    statusFilter.addEventListener('change', function () {
        fetchAndUpdateProducts(1);
    });

    // Function to fetch data and update UI
    function fetchAndUpdateProducts(page) {
        const searchValue = encodeURIComponent(searchInput.value);
        const statusValue = statusFilter.value;
        fetch(`/product/full?page=${page}&search=${searchValue}&status=${statusValue}&json=true`) // Assuming json=true triggers JSON response
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                updateProductList(data.products);
                initPagination(page, data._numberOfItems, data._limit);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }

    // Dynamically create and update product listings
    function updateProductList(products) {
        productList.innerHTML = ''; // Clear existing products

        if (products.length === 0) {
            // If no products are returned, display an image
            productList.innerHTML = `
                <div class="col-12 d-flex justify-content-center">
                    <img src="/img/no_product_found.png" alt="No available products" style="width: 50%; height: auto;">
                </div>
            `;
        } else {
            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product-item col align-self-stretch d-flex align-items-stretch';
                productDiv.style.cursor = 'pointer'; // Add cursor style
                productDiv.addEventListener('click', function () {
                    window.location.href = `./specific-product/${product._id}`;
                });
                // console.log(product.idAccount.shopName);
                productDiv.innerHTML = `
                    <div class="row box w-100">

                        <img class='product-img col-4 align-self-center' src='${product.image}' />
                        <div class='col-6 d-flex flex-column'>
                        <p class='list-inline-item'><strong>${product.name}</strong></p>
                        <p class='list-inline-item'>Shop: ${product.idAccount.shopName}</p>
                        <div class='list-inline-item'>Status: <div class='list-inline-item status'>${product.status}</div>
                        </div>
                        <p class='list-inline-item'>Category: ${product.category}</p>
                        <p class='list-inline-item'>Price: ${formatCurrency(product.price)}</p>
                        <p class='list-inline-item flex-fill'>Stock: ${product.stock}</p>
                        </div>
                        
                        <form class='dropdown col-2 text-center mt-1' action='./exec-product?type=ban&id=${product._id}' method="post" onclick="event.stopPropagation();">
                        <a class='dropdown text-center' href='#' role='button' id='dropdownMenuLink' data-bs-toggle='dropdown' aria-expanded='false'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M5 10c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2Zm14 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2Zm-7 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2Z"/></svg>
                        </a>
                        <ul class='dropdown-menu' aria-labelledby='dropdownMenuLink'>
                            <li><a class='dropdown-item' href='./specific-product/${product._id}'>View info</a></li>
                            <li><button type="submit" class='dropdown-item'>Ban</button></li>
                        </ul>
                        </form>
                    </div>
                    `;
                productList.appendChild(productDiv);
            });
            updateStatusStyles();
        }
    }
    function formatCurrency(number) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(number);
    }

    // Function to update status colors based on their text
    window.updateStatusStyles = function () {
        const statuses = document.querySelectorAll(".status");
        statuses.forEach(e => {
            switch (e.innerText.trim()) {
                case "Available":
                    e.style.color = "#0e760e";
                    break;
                case "Banned":
                    e.style.color = "#e55039";
                    break;
                case "Reported":
                    e.style.color = "#fa983a";
                    break;
                case "Pending":
                case "Trending":
                    e.style.color = "#2980b9";
                    break;
                default:
                    e.innerText = "No status";
                // e.style.color = "#0e760e";
            }
            e.style.fontStyle = "italic";
        });
    }

    // Initialize or update pagination dynamically
    window.initPagination = function (currentPage, numberOfItems, limit) {
        // console.log('Pagination:', currentPage, numberOfItems, limit);
        const numPages = Math.ceil(numberOfItems / limit);
        const leftMost = currentPage - ((currentPage - 1) % 3);
        pagination.innerHTML = ''; // Clear existing pagination
        if (numberOfItems > 0) {
            pagination.classList.remove("d-none");
            createPaginationItem('<<', 1);
            createPaginationItem('<', Math.max(1, currentPage - 1));

            for (let i = leftMost; i <= Math.min(leftMost + 2, numPages); i++) {
                createPaginationItem(i, i, i === currentPage);
            }

            createPaginationItem('>', Math.min(currentPage + 1, numPages));
            createPaginationItem('>>', numPages);
        } else {
            pagination.classList.add("d-none");
        }
    };
    // function initPagination(currentPage, numberOfItems, limit) {
    //     console.log('Pagination:', currentPage, numberOfItems, limit);
    //     const numPages = Math.ceil(numberOfItems / limit);
    //     const leftMost = currentPage - ((currentPage - 1) % 3);
    //     pagination.innerHTML = ''; // Clear existing pagination
    //     if (numberOfItems > 0) {
    //         pagination.classList.remove("d-none");
    //         createPaginationItem('<<', 1);
    //         createPaginationItem('<', Math.max(1, currentPage - 1));

    //         for (let i = leftMost; i <= Math.min(leftMost + 2, numPages); i++) {
    //             createPaginationItem(i, i, i === currentPage);
    //         }

    //         createPaginationItem('>', Math.min(currentPage + 1, numPages));
    //         createPaginationItem('>>', numPages);
    //     } else {
    //         pagination.classList.add("d-none");
    //     }
    // }

    // Create and append pagination items
    function createPaginationItem(text, page, isActive = false) {
        const li = document.createElement('li');
        li.className = 'pagination-item col text-center';
        const a = document.createElement('a');
        a.className = 'pagination-link' + (isActive ? ' pagination-active' : '');
        a.href = '#';
        a.textContent = text;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            fetchAndUpdateProducts(page);
        });
        li.appendChild(a);
        pagination.appendChild(li);
    }

    // Initial fetch for page 1
    // fetchAndUpdateProducts(1);
});  