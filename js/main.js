(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  var filters = document.querySelectorAll("[data-filter]");
  var items = document.querySelectorAll("[data-category]");

  if (filters.length && items.length) {
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var category = btn.getAttribute("data-filter");
        filters.forEach(function (other) {
          other.setAttribute("aria-pressed", other === btn ? "true" : "false");
        });
        items.forEach(function (item) {
          var match = category === "all" || item.getAttribute("data-category") === category;
          item.classList.toggle("is-hidden", !match);
        });
      });
    });
  }

  var form = document.querySelector("#quote-form");
  var thanks = document.querySelector("#quote-thanks");
  var thanksName = document.querySelector("#thanks-name");

  if (form && thanks) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var nameInput = form.querySelector("#name");
      var name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "there";
      if (thanksName) thanksName.textContent = name;
      form.classList.add("is-hidden");
      thanks.classList.add("is-visible");
      thanks.focus();
      thanks.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
})();
