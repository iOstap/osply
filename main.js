// ----------- MOVING SECTIONS ----------- //

ScrollTrigger.config({ limitCallbacks: true });
ScrollTrigger.defaults({ lagSmoothing: 100 });

const isDesktop = window.innerWidth >= 992;

if (isDesktop) {
  gsap.to(".shadow-scroll", {
    opacity: 1,
    ease: "none",
    scrollTrigger: {
      trigger: ".section-about",
      start: "top bottom",
      end: "top top",
      scrub: true
    }
  });

  gsap.to(".hero-left-side", {
    y: "-10vh",
    ease: "none",
    scrollTrigger: {
      trigger: ".section-about",
      start: "top bottom",
      end: "top top",
      scrub: 0.6
    }
  });
}

gsap.to(".shadow-rv", {
  opacity: 1,
  ease: "none",
  scrollTrigger: {
    trigger: ".review-section",
    start: "top bottom",
    end: "top top",
    scrub: true
  }
});

gsap.to(".cms-wrapper", {
  y: isDesktop ? "-25vh" : "-10vh",
  ease: "none",
  scrollTrigger: {
    trigger: ".review-section",
    start: "top bottom",
    end: "top top",
    scrub: 0.6
  }
});

gsap.to(".shadow-sr", {
  opacity: 1,
  ease: "none",
  scrollTrigger: {
    trigger: ".section-sr",
    start: "top bottom",
    end: "top top",
    scrub: true
  }
});

gsap.to(".grid-rv", {
  y: isDesktop ? "-25vh" : "-10vh",
  ease: "none",
  scrollTrigger: {
    trigger: ".section-sr",
    start: "top bottom",
    end: "top top",
    scrub: 0.6
  }
});


// ----------- MODAL + LENIS ----------- //

window.addEventListener("DOMContentLoaded", () => {
  let lenis, modalLenis;

  if (Webflow.env("editor") === undefined) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1.1, gestureOrientation: "vertical", normalizeWheel: false, smoothTouch: false });
    lenis.stop();
    setTimeout(() => lenis.start(), 3000);

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    $("[data-lenis-start]").on("click", () => lenis.start());
    $("[data-lenis-stop]").on("click", () => lenis.stop());
    $("[data-lenis-toggle]").on("click", function () {
      $(this).toggleClass("stop-scroll");
      $(this).hasClass("stop-scroll") ? lenis.stop() : lenis.start();
    });
  }

  function initModalLenis() {
    if (modalLenis) modalLenis.destroy();

    const modalWrapper = document.querySelector('[tr-ajaxmodal-element="lightbox-modal"]');
    const modalContent = modalWrapper.querySelector('*');

    modalLenis = new Lenis({ wrapper: modalWrapper, content: modalContent, lerp: 0.1, wheelMultiplier: 1.2, gestureOrientation: "vertical", normalizeWheel: false, smoothTouch: false });

    function rafModal(time) {
      modalLenis.raf(time);
      modalLenis._raf = requestAnimationFrame(rafModal);
    }
    modalLenis._raf = requestAnimationFrame(rafModal);
  }

  function destroyModalLenis() {
    if (modalLenis) {
      cancelAnimationFrame(modalLenis._raf);
      modalLenis.destroy();
      modalLenis = null;
    }
  }

  function adjaxModal() {
    const lightbox = $("[tr-ajaxmodal-element='lightbox']");
    const lightboxClose = $("[tr-ajaxmodal-element='lightbox-close']").attr("aria-label", "Close Modal");
    const lightboxModal = $("[tr-ajaxmodal-element='lightbox-modal']");
    const cmsLink = "[tr-ajaxmodal-element='cms-link']";
    const cmsPageContent = "[tr-ajaxmodal-element='cms-page-content']";
    let initialPageTitle = document.title;
    let initialPageUrl = window.location.href;
    let focusedLink;

    function updatePageInfo(newTitle, newUrl) {
      lightboxModal.empty();
      document.title = newTitle;
      window.history.replaceState({}, "", newUrl);
    }

    let tl = gsap.timeline({
      paused: true,
      onReverseComplete: () => {
        focusedLink.focus();
        updatePageInfo(initialPageTitle, initialPageUrl);
        ScrollTrigger.refresh();
      },
      onComplete: () => lightboxClose.focus()
    });

    tl.set("body", { overflow: "hidden" });
    tl.set(lightbox, { display: "flex", onComplete: () => lightboxModal.scrollTop(0) });
    tl.set(lightboxModal, { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" });
    tl.to(lightbox, { duration: 0 });
    tl.from(".back-modal", { opacity: 0, duration: 0.6 });
    tl.to(lightboxModal, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      duration: 1.2,
      ease: "expo.out"
    }, "<+=0.2");

    function keepFocusWithinLightbox() {
      let lastFocusableChild = lightbox
        .find("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
        .not(":disabled")
        .not("[aria-hidden=true]")
        .last();
      lastFocusableChild.on("focusout", () => {
        lightboxClose.focus();
      });
    }

    function lightboxReady() {
      const $img = $(".img-cn");
      if ($img.length) {
        const tlImgText = gsap.timeline();

        tlImgText.set($img, {
          clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)",
          rotate: 35,
          filter: "blur(40px)"
        });

        tlImgText.to($img, {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          rotate: 0,
          filter: "blur(0px)",
          duration: 1.8,
          ease: "expo.inOut"
        }, 0);

        tlImgText.add(() => {
          gsap.set('[data-split="heading"]', { opacity: 1 });
          runTextAnimationWithDelay();
        }, 0);
      } else {
        gsap.set('[data-split="heading"]', { opacity: 1 });
        runTextAnimationWithDelay();
      }

      setTimeout(() => {
        handleParallax();
      }, 100);
    }

    function runTextAnimationWithDelay() {
      requestAnimationFrame(() => {
        initMaskedTextReveal(lightboxModal[0]);
        ScrollTrigger.refresh();
      });
    }

    $(document).on("click", cmsLink, function (e) {
      focusedLink = $(this);
      initialPageUrl = window.location.href;
      e.preventDefault();
      let linkUrl = $(this).attr("href");

      $.ajax({
        url: linkUrl,
        success: function (response) {
          let cmsContent = $(response).find(cmsPageContent);
          let cmsTitle = $(response).filter("title").text();
          let cmsUrl = window.location.origin + linkUrl;

          updatePageInfo(cmsTitle, cmsUrl);
          lightboxModal.append(cmsContent);
          tl.play();
          keepFocusWithinLightbox();
          lightboxReady();
          initModalLenis();
        }
      });
    });

    function closeModal() {
      tl.reverse();
      tl.eventCallback("onReverseComplete", () => {
        updatePageInfo(initialPageTitle, initialPageUrl);
        ScrollTrigger.refresh();
        destroyModalLenis();
      });
    }

    lightboxClose.on("click", closeModal);

    $(document).on("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    $(document).on("click", lightbox, function (e) {
      if (!$(e.target).is(lightbox.find("*"))) closeModal();
    });
  }

  adjaxModal();

  function initParallax(el) {
    if (el.dataset.parallaxInitialized) return;

    const hasParallax = el.hasAttribute("data-parallax");
    const hasOffMobile = el.hasAttribute("data-off-mobile");

    if (hasParallax && hasOffMobile && window.innerWidth <= 768) {
      el.dataset.parallaxInitialized = "true";
      return;
    }

    if (hasParallax) {
      const val = parseFloat(el.getAttribute("data-parallax")) || 1.2;

      const ukiyo = new Ukiyo(el, {
        scale: val,
        speed: val,
        willChange: true,
        externalRAF: false
      });

      el.dataset.parallaxInstance = ukiyo;
      el.dataset.parallaxInitialized = "true";
      el.style.zIndex = '1';
    }
  }

  function destroyParallax(el) {
    if (!el.dataset.parallaxInitialized) return;

    if (el.dataset.parallaxInstance) {
      const ukiyoInstance = el.dataset.parallaxInstance;
      if (ukiyoInstance?.destroy) ukiyoInstance.destroy();
      delete el.dataset.parallaxInstance;
    }

    delete el.dataset.parallaxInitialized;
  }

  function handleParallax() {
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const hasOffMobile = el.hasAttribute("data-off-mobile");

      if (window.innerWidth <= 768 && hasOffMobile) {
        destroyParallax(el);
      } else {
        if (!el.dataset.parallaxInitialized) initParallax(el);
      }
    });
  }

  handleParallax();

  window.addEventListener("resize", () => {
    handleParallax();
  });
});



// ----------- LOAD HERO LOGO ----------- //

gsap.set(".spline-w", { 
  clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)",
  rotate: 35,
});

gsap.set(".hero-3d", {
  rotate: -35
});

let imgTl = gsap.timeline({ delay: 1.2 });

imgTl.to(".spline-w", { 
  clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  rotate: 0,
  duration: 2, 
  ease: "expo.inOut"
}, 0);

imgTl.to(".hero-3d", {
  rotate: 0,
  duration: 2,
  ease: "expo.inOut"
}, 0);




  // ----------- LETTERS ANIMATION ----------- //

  const initSplitText = (el, mode = 'center-down', delay = 0) => {
    const splitLines = new SplitText(el, {
      type: "lines",
      linesClass: "line",
      mask: "lines"
    });

    splitLines.lines.forEach((line) => {
      const splitChars = new SplitText(line, {
        type: "chars",
        charsClass: "char"
      });

      gsap.set(splitChars.chars, {
        yPercent:
          mode === 'left-up' ? 100 :
          mode === 'left-down' ? -100 :
          -100
      });

      const centerIndex = Math.floor(splitChars.chars.length / 2);

      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () => {
          gsap.to(splitChars.chars, {
            yPercent: 0,
            ease: "expo.out",
            duration: 1.4,
            delay: delay,
            stagger: (i) => {
              if (mode === 'center-down') {
                return Math.abs(i - centerIndex) * 0.15;
              } else if (mode === 'left-up') {
                return i * 0.075;
              } else if (mode === 'left-down') {
                return i * 0.075;
              }
              return 0;
            }
          });
        }
      });
    });
  };



  // ----------- FOOTER TEXT ----------- //

  const logoSplit = new SplitText(".logo-text", {
    type: "lines",
    linesClass: "line",
    mask: "lines"
  });

  logoSplit.lines.forEach((line) => {
    const splitChars = new SplitText(line, {
      type: "chars",
      charsClass: "char"
    });

    gsap.set(splitChars.chars, {
      yPercent: -100
    });

    const centerIndex = Math.floor(splitChars.chars.length / 2);
    const triggerStart = window.innerWidth <= 991 ? "top 50%" : "top 5%";

    ScrollTrigger.create({
      trigger: ".footer-way",
      start: triggerStart,
      once: true,
      onEnter: () => {
        gsap.to(splitChars.chars, {
          yPercent: 0,
          ease: "expo.out",
          duration: 1.6,
          stagger: (i) => Math.abs(i - centerIndex) * 0.15
        });
      }
    });
  });
  // ----------- CUSTOM ATTRIBUTES ----------- //

  document.querySelectorAll("[data-letters-text]").forEach((el) => {
    if (el.classList.contains("logo-text")) return;

    const mode = el.getAttribute("data-letters-text");
    const delayAttr = el.getAttribute("data-letters-delay");
    const delay = delayAttr ? parseFloat(delayAttr) : 0;

    initSplitText(el, mode, delay);
  });




// ----------- NAV BAR ----------- //

CustomEase.create("cubicDefault", "0.65,0.05,0,1");

const nav = document.querySelector('.links-nav');
const navContent = document.querySelector('.nav-bar');
const backNav = document.querySelector('.back-nav');
const links = document.querySelectorAll('.link-w');

const lineTop = document.querySelector('.line-top-w');
const lineBottom = document.querySelector('.line-bottom-w');
const linkLines = document.querySelectorAll('.line-link');
const textAbout = document.querySelector('.text-about');
const textWork = document.querySelector('.text-work');
const textContact = document.querySelector('.text-contact');

const textMenu = document.querySelector('.text-menu');
const textClose = document.querySelector('.text-close');

let isOpen = false;

function runScrambleText(el) {
  const scrambleCharacters = "01";

  if (el._split) {
    el._split.revert();
    delete el._split;
  }

  const split = new SplitText(el, {
    type: "chars",
    charsClass: "single-char",
    tag: "span"
  });

  el._split = split;

  const chars = el.querySelectorAll('.single-char');
  const scrambleStagger = parseFloat(el.getAttribute('data-scroll-scramble')) || 0.0125;
  const delay = parseFloat(el.getAttribute('data-scroll-delay')) || 0;

  gsap.set(chars, { opacity: 0 });

  const tl = gsap.timeline({ delay });

  tl.to(chars, {
    duration: 0.3,
    stagger: scrambleStagger,
    scrambleText: {
      text: "{original}",
      speed: 0,
      chars: scrambleCharacters,
      tweenLength: false,
      revealDelay: 0.2
    }
  });

  tl.set(chars, {
    opacity: 1,
    stagger: scrambleStagger
  }, "<");
}

function openMenu() {
  nav.classList.add('open');
  gsap.set(backNav, { display: 'block' });
  gsap.to(backNav, { opacity: 1, duration: 0.6, ease: "power2.out" });
  gsap.to(nav, { height: nav.scrollHeight, duration: 0.8, ease: "cubicDefault" });
  gsap.to(lineTop, { y: "0.215rem", duration: 0.8, ease: "cubicDefault" });
  gsap.to(lineBottom, { y: "-0.15rem", duration: 0.8, ease: "cubicDefault" });

  linkLines.forEach((line, i) => {
    gsap.to(line, {
      width: "100%",
      height: "1px",
      duration: 0.8,
      ease: "cubicDefault",
      delay: 0.2 + i * 0.1
    });
  });

  gsap.to([textAbout, textWork, textContact], {
    y: "0%",
    duration: 0.8,
    ease: "cubicDefault",
    stagger: 0.1,
    delay: 0.2
  });

  gsap.to([textMenu, textClose], {
    y: "-100%",
    duration: 0.8,
    ease: "cubicDefault"
  });

  document.querySelectorAll('[data-click-scramble="true"]').forEach(runScrambleText);
}

function closeMenu() {
  nav.classList.remove('open');
  gsap.to(backNav, {
    opacity: 0,
    duration: 0.6,
    ease: "power2.out",
    onComplete: () => gsap.set(backNav, { display: 'none' })
  });
  gsap.to(nav, { height: 0, duration: 0.8, ease: "cubicDefault" });
  gsap.to(lineTop, { y: "0rem", duration: 0.8, ease: "cubicDefault" });
  gsap.to(lineBottom, { y: "0rem", duration: 0.8, ease: "cubicDefault" });

  linkLines.forEach(line => {
    gsap.to(line, { width: "0%", height: "1px", duration: 0.8, ease: "cubicDefault" });
  });

  gsap.to([textAbout, textWork, textContact], {
    y: "100%",
    duration: 0.8,
    ease: "cubicDefault"
  });

  gsap.to([textMenu, textClose], {
    y: "0%",
    duration: 0.8,
    ease: "cubicDefault"
  });
}

navContent.addEventListener('click', e => {
  if (e.target.closest('.link-w')) return;
  e.stopPropagation();
  isOpen ? closeMenu() : openMenu();
  isOpen = !isOpen;
});

links.forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    const isAnchor = href && href.startsWith('#');

    if (isOpen) {
      e.preventDefault();
      closeMenu();
      isOpen = false;

      if (isAnchor) {
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  });
});

document.addEventListener('click', e => {
  if (isOpen && !nav.contains(e.target) && !navContent.contains(e.target)) {
    closeMenu();
    isOpen = false;
  }
});

gsap.set('.nav-wrapper', { height: 0 });
window.addEventListener('DOMContentLoaded', () => {
  gsap.to('.nav-wrapper', { height: 'auto', delay: 2, duration: 1.2, ease: 'out.expo' });
});



// ----------- PARALLAX IMG ----------- //

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-parallax]').forEach(el => {
    if (el.complete) {
      initParallax(el);
    } else {
      el.addEventListener('load', () => initParallax(el));
    }
  });
});

function initParallax(el) {
  if (el.dataset.parallaxInitialized) return;

  const val = parseFloat(el.getAttribute('data-parallax')) || 1.2;

  new Ukiyo(el, {
    scale: val,
    speed: val,
    willChange: true,
    externalRAF: false
  });

  el.style.zIndex = '1';
  el.dataset.parallaxInitialized = "true";
}



  // --------- SCRAMBLE TEXT --------- //

  Webflow.push(function () {
    gsap.registerPlugin(SplitText, ScrambleTextPlugin, ScrollTrigger);

    const scrambleCharacters = "01";

    document.querySelectorAll('[data-split-text="true"]').forEach(el => {
      gsap.set(el, { opacity: 1 });

      const split = new SplitText(el, {
        type: "chars",
        charsClass: "single-char",
        tag: "span"
      });

      const chars = el.querySelectorAll('.single-char');
      const scrambleStagger = parseFloat(el.getAttribute('data-scroll-scramble')) || 0.0125;
      const delay = parseFloat(el.getAttribute('data-scroll-delay')) || 0;

      gsap.set(chars, { opacity: 0 });

      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          end: "bottom 0%",
          toggleActions: "play none none none"
        },
        delay: delay
      });

      tl.to(chars, {
        duration: 0.3,
        stagger: scrambleStagger,
        scrambleText: {
          text: "{original}",
          speed: 0,
          chars: scrambleCharacters,
          tweenLength: false,
          revealDelay: 0.2
        }
      });

      tl.set(chars, {
        opacity: 1,
        stagger: scrambleStagger
      }, "<");
    });

    // --- Hover Scramble Text ---
    document.querySelectorAll('[hover-scramble="link"]').forEach(link => {
      link.addEventListener('mouseenter', () => {
        const chars = link.querySelectorAll('.single-char');
        if (!chars.length) return;

        gsap.fromTo(chars, {
          scrambleText: {
            text: "{original}",
            chars: scrambleCharacters,
            speed: 0,
            tweenLength: false,
            revealDelay: 0.1
          }
        }, {
          duration: 0.5,
          scrambleText: {
            text: "{original}",
            chars: scrambleCharacters,
            speed: 0,
            tweenLength: false,
            revealDelay: 0.1
          },
          stagger: 0.04
        });
      });
    });
  });



  // ----------- SLIDE UP TEXT ----------- //

document.addEventListener("DOMContentLoaded", () => {
  gsap.set('[data-split="heading"]', { opacity: 1 });
  initMaskedTextReveal(document);
});

function initMaskedTextReveal(context = document) {
  const headings = context.querySelectorAll('[data-split="heading"]');

  headings.forEach(heading => {
    if (heading._split) heading._split.revert();
    const split = SplitText.create(heading, {
      type: "lines",
      mask: "lines",
      linesClass: "line"
    });
    heading._split = split;

    const delayAttr = heading.getAttribute("data-split-delay");
    const delay = delayAttr ? parseFloat(delayAttr) : 0;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heading,
        start: "top 90%",
        once: true
      },
      delay: delay
    });

    tl.from(split.lines, {
      yPercent: 110,
      opacity: 0,
      duration: 1.2,
      stagger: 0.08,
      ease: "power4.out(2)"
    });
  });
}


  // ----------- SHOW IMAGE ----------- //

 const animatedImages = document.querySelectorAll('[data-image="animate"]');

  animatedImages.forEach((el) => {
    gsap.set(el, {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
    });

    gsap.to(el, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      duration: 1.2,
      ease: "expo.out",
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        once: true,
      },
    });
  });



// ---------------- CURSOR ---------------- //

 document.addEventListener("DOMContentLoaded", ()=>{
   
  let cursorItem = document.querySelector(".cursor")
  let cursorParagraph = cursorItem.querySelector("p")
  let targets = document.querySelectorAll("[data-cursor]")
  let xOffset = 14;
  let yOffset = 32;
  let cursorIsOnRight = false;
  let currentTarget = null;
  let lastText = '';
  
  gsap.set(cursorItem, {xPercent: xOffset, yPercent: yOffset});

  let xTo = gsap.quickTo(cursorItem, "x", { ease: "power3"});
  let yTo = gsap.quickTo(cursorItem, "y", { ease: "power3"});

  window.addEventListener("mousemove", e => {
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let scrollY = window.scrollY;
    let cursorX = e.clientX;
    let cursorY = e.clientY + scrollY;

    // Default offsets
    let xPercent = xOffset;
    let yPercent = yOffset;

    if (cursorX > windowWidth * 0.81) {
      cursorIsOnRight = true;
      xPercent = -100;
    } else{
      cursorIsOnRight = false;
    }

    if (cursorY > scrollY + windowHeight * 0.9) {
      yPercent = -120; 
    }
    
    if (currentTarget) {
      let newText = currentTarget.getAttribute("data-cursor");
      if (currentTarget.hasAttribute("data-easteregg") && cursorIsOnRight) {
        newText = currentTarget.getAttribute("data-easteregg");
      }

      if (newText !== lastText) {
        cursorParagraph.innerHTML = newText;
        lastText = newText;
      }
    }

    gsap.to(cursorItem, { xPercent: xPercent, yPercent: yPercent, duration: 0.9, ease: "power3" });
    xTo(cursorX);
    yTo(cursorY - scrollY); 
  });

  
  targets.forEach(target => {
    target.addEventListener("mouseenter", () => {
      currentTarget = target; 
      
      let newText = target.hasAttribute("data-easteregg")
        ? target.getAttribute("data-easteregg")
        : target.getAttribute("data-cursor");

      if (newText !== lastText) {
        cursorParagraph.innerHTML = newText;
        lastText = newText;
      }
    });
  });
  
 })


  // ----------- CASE STUDIES SCROLL ----------- //

  const projects = gsap.utils.toArray(".cms-item");
  const wrapper = document.querySelector(".cms-wrapper");

  wrapper.style.height = `${projects.length * 100}vh`;

  projects.forEach((proj, i) => {
    const title = proj.querySelector(".title");
    const number = proj.querySelector(".number");
    const cover = proj.querySelector(".cover-cs");

    gsap.set(title, { yPercent: i === 0 ? 0 : 100 });
    gsap.set(number, { yPercent: i === 0 ? 0 : 100 });
    gsap.set(cover, {
      clipPath: i === 0 ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)",
      scale: i === 0 ? 1 : 1.1,
      pointerEvents: i === 0 ? "auto" : "none",
    });
  });

  projects.forEach((proj, i) => {
    const isLast = i === projects.length - 1;
    const currentTitle = proj.querySelector(".title");
    const currentNumber = proj.querySelector(".number");
    const currentCover = proj.querySelector(".cover-cs");

    const next = projects[i + 1];
    const nextTitle = next?.querySelector(".title");
    const nextNumber = next?.querySelector(".number");
    const nextCover = next?.querySelector(".cover-cs");

    const base = window.innerHeight * i;

    let textChanged = false;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".cms-wrapper",
        start: `top+=${base} top`,
        end: `top+=${base + window.innerHeight} top`,
        scrub: true,
        onUpdate: (self) => {
          if (isLast) return;

          if (self.progress > 0.5) {
            gsap.set(currentCover, { pointerEvents: "none" });
            gsap.set(nextCover, { pointerEvents: "auto" });
          } else {
            gsap.set(currentCover, { pointerEvents: "auto" });
            gsap.set(nextCover, { pointerEvents: "none" });
          }

          if (self.progress > 0.5 && !textChanged) {
            textChanged = true;
            gsap.to(currentTitle, {
              yPercent: -100,
              duration: 1,
              ease: "cubicDefault"
            });
            gsap.to(currentNumber, {
              yPercent: -100,
              duration: 1,
              ease: "cubicDefault"
            });
            gsap.fromTo(nextTitle,
              { yPercent: 100 },
              { yPercent: 0, duration: 1, ease: "cubicDefault" }
            );
            gsap.fromTo(nextNumber,
              { yPercent: 100 },
              { yPercent: 0, duration: 1, ease: "cubicDefault" }
            );
          }

          if (self.progress <= 0.5 && textChanged) {
            textChanged = false;
            gsap.to(currentTitle, {
              yPercent: 0,
              duration: 1,
              ease: "cubicDefault"
            });
            gsap.to(currentNumber, {
              yPercent: 0,
              duration: 1,
              ease: "cubicDefault"
            });
            gsap.to(nextTitle, {
              yPercent: 100,
              duration: 1,
              ease: "cubicDefault"
            });
            gsap.to(nextNumber, {
              yPercent: 100,
              duration: 1,
              ease: "cubicDefault"
            });
          }
        }
      }
    });

    if (!isLast) {
      tl.fromTo(nextCover,
        { clipPath: "inset(100% 0 0 0)", scale: 1.2 },
        { clipPath: "inset(0% 0 0 0)", scale: 1, ease: "none" },
        0
      );
    }
  });



  // ----------- MOVE READY BLOCK ----------- //

if (window.innerWidth <= 2560) {
  gsap.fromTo(
    '.btn-sr-w',
    { width: '0vw', overflow: 'hidden' },
    {
      width: '33vw',
      ease: 'cubicDefault',
      duration: 1,
      delay: 1,
      scrollTrigger: {
        trigger: '.btn-sr-w',
        start: 'top bottom',
      },
    }
  );
}


  // ----------- FOOTER TRANSITION ----------- //

gsap.to(".footer", {
  height: "101vh",
  ease: "none",
  scrollTrigger: {
    trigger: ".footer-way",
    start: "top bottom",
    end: "top top",
    scrub: 1,
  }
});



// ----------- TIME ----------- //

function getTime24() {
    const myTimes = document.querySelectorAll(".day-24h");
    const date = new Date();

    const options = {
        hourCycle: 'h24',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Paris'
    };
    const getTime = new Intl.DateTimeFormat([], options).format(date);

    myTimes.forEach(el => {
        el.innerText = getTime;
    });
}

setInterval(getTime24, 1000);
