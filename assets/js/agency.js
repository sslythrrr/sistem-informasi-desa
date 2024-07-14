(function() {
  "use strict";

  var mainNav = document.querySelector('#mainNav');

  if (mainNav) {
    var navbarCollapse = mainNav.querySelector('.navbar-collapse');
    var navTextTop = document.getElementById('navTextTop');
    var navTextBottom = document.getElementById('navTextBottom');
    
    // Check if we're on the index page
    var isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

    if (navbarCollapse) {
      var collapse = new bootstrap.Collapse(navbarCollapse, {
        toggle: false
      });
      
      var navbarItems = navbarCollapse.querySelectorAll('a');
      
      // Closes responsive menu when a scroll trigger link is clicked
      for (var item of navbarItems) {
        item.addEventListener('click', function (event) {
          collapse.hide();
        });
      }
    }

    var collapseNavbar = function() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var isAtTop = scrollTop <= 100;
      var isMobile = window.innerWidth < 992; // Assuming 992px as the breakpoint for mobile
    
      if (isIndexPage && !isMobile) {
        if (!isAtTop) {
          mainNav.classList.add("navbar-shrink");
          applyCollapsedStyle(mainNav);
        } else {
          mainNav.classList.remove("navbar-shrink");
          removeCollapsedStyle(mainNav);
        }
      } else {
        // Always keep navbar collapsed and styled on mobile or other pages
        mainNav.classList.add("navbar-shrink");
        applyCollapsedStyle(mainNav);
      }
    };
    
    function applyCollapsedStyle(nav) {
      nav.style.color = 'rgb(255,131,131)';
      nav.style.background = '#072e48';
      nav.style.borderColor = 'var(--bs-code-color)';
      nav.style.setProperty('--bs-primary', '#221e12');
      nav.style.setProperty('--bs-primary-rgb', '34,30,18');
    }
    
    function removeCollapsedStyle(nav) {
      nav.style.color = '';
      nav.style.background = '';
      nav.style.borderColor = '';
      nav.style.removeProperty('--bs-primary');
      nav.style.removeProperty('--bs-primary-rgb');
    }
    
    // Call the function on load and scroll
    window.addEventListener('load', collapseNavbar);
    window.addEventListener('scroll', collapseNavbar);
    window.addEventListener('resize', collapseNavbar);

    // Collapse now if page is not at top or not on index page
    collapseNavbar();
    // Collapse the navbar when page is scrolled (only on index page)
    if (isIndexPage) {
      document.addEventListener("scroll", collapseNavbar);
    }

    // Hide navbar when modals trigger
    var modals = document.querySelectorAll('.kegiatan-modal');
      
    for (var modal of modals) {
      modal.addEventListener('shown.bs.modal', function (event) {
        mainNav.classList.add('d-none');
      });
        
      modal.addEventListener('hidden.bs.modal', function (event) {
        mainNav.classList.remove('d-none');
      });
    }

    // Add active class to navbarItems based on scroll position (only on index page)
    function onScroll() {
      if (isIndexPage) {
        var scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        var sections = document.querySelectorAll('section');
        var navItems = document.querySelectorAll('#mainNav .nav-link');

        sections.forEach(function(section) {
          var sectionTop = section.offsetTop - 50;
          var sectionBottom = sectionTop + section.offsetHeight;
          var sectionId = section.getAttribute('id');

          if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            navItems.forEach(function(navItem) {
              navItem.classList.remove('active');
              if (navItem.getAttribute('href') === '#' + sectionId) {
                navItem.classList.add('active');
              }
            });
          }
        });
      }
    }

    // Call onScroll function on scroll (only on index page)
    if (isIndexPage) {
      window.addEventListener('scroll', onScroll);
      // Call onScroll function on load to set initial state
      window.addEventListener('load', onScroll);
    }
  }

  // Back to top button functionality
  var backToTopButton = document.getElementById("backToTop");

  if (backToTopButton) {
    window.onscroll = function() {
      var kegiatanSection = document.getElementById("kegiatan");
      if (kegiatanSection && kegiatanSection.getBoundingClientRect().top <= 0) {
        backToTopButton.style.display = "block";
      } else {
        backToTopButton.style.display = "none";
      }
    };

    backToTopButton.onclick = function() {
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    };
  }

})();