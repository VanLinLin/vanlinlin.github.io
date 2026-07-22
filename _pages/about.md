---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

<span class='anchor' id='about-me'></span>

<div class="hero">
  <span class="hero__blob hero__blob--1" aria-hidden="true"></span>
  <span class="hero__blob hero__blob--2" aria-hidden="true"></span>
  <p class="hero__greet">Hi there 👋 I'm</p>
  <h1 class="hero__name">Yu-Fan (Van) Lin</h1>
  <p class="hero__typing-line"><span id="hero-typing" data-roles='["Computer Vision Researcher","M.S. Student @ NCKU ACVLAB","Challenge Winner × 7 🏆","Multimodal Learning Enthusiast"]'></span><span class="hero__cursor" aria-hidden="true"></span></p>

  <div class="hero__intro" markdown="1">
I am a master's student with the [Advanced Computer Vision Laboratory (ACVLAB)](https://sites.google.com/view/acvlab/) at the Institute of Data Science, National Cheng Kung University (NCKU), Tainan, Taiwan. I actively participate in various competitions and research projects as part of the ACVLAB team.

Previously, I earned my bachelor's degree from the Department of Applied Mathematics at National Chung Hsing University (NCHU), where I engaged in multiple projects during my undergraduate studies.

I am also enthusiastic about exploring other cutting-edge fields in artificial intelligence and data science. I actively seek opportunities for collaboration — let's connect and share ideas to push boundaries together!
  </div>

  <div class="hero__interests">
    <span class="tag-chip">Multimodal Learning</span>
    <span class="tag-chip">Image / Video Processing</span>
    <span class="tag-chip">Image Restoration</span>
  </div>

  <div style="margin-top: 0.8em;">
    <a class="btn-pill btn-pill--paper" href="https://drive.google.com/file/d/1CUPKXi3Q4WWr_Gbj3hpmXSwG03fYPyzs/view?usp=sharing" target="_blank" rel="noopener"><i class="fas fa-file-download" aria-hidden="true"></i> Resume / CV</a>
    <span style="font-size: 0.8em; color: var(--ink-3);">last updated Jan 04, 2026</span>
  </div>
</div>

{% include stats-row.html %}

# 🔥 News

{% include news-timeline.html limit=8 %}

# 📝 Selected Publications

{% include pub-cards.html data=site.data.publications %}

# 🎖 Honors and Awards

{% include awards-list.html %}

# 🔨 Projects

{% include pub-cards.html data=site.data.research_projects %}

## 💼 Funded & Industry Projects

{% include funded-list.html %}

# 📖 Education

{% include edu-list.html %}

# 💼 Academic Services

{% include services-list.html %}

# 🌍 Global Collaborations

<div class="globe-card reveal" style="width:100%; max-width:1000px; margin: 10px auto 30px; text-align:center;">
<div id="visitor-map-holder" style="margin:0 auto;">
<script type="text/javascript" id="mapmyvisitors" src="//mapmyvisitors.com/map.js?d=8ADnNsCiMHFDsAXXuNSPeDLnFpxr3cBBct0zxB4WkaQ&cl=ffffff&w=a"></script>
</div>
<script>
(function () {
  /* mapmyvisitors requests its land-outline PNG at the measured container
     width; fractional widths (browser zoom, fluid layouts) make the server
     return HTTP 500 and the map loses its continents. Pin the holder to an
     integer pixel width before the widget measures it. */
  var h = document.getElementById('visitor-map-holder');
  if (!h) return;
  function pin() {
    h.style.width = '';
    var w = Math.floor(h.getBoundingClientRect().width);
    if (w > 0) { h.style.width = w + 'px'; }
  }
  pin();
  window.addEventListener('resize', pin);
})();
</script>
</div>
