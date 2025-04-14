fetch('/results/gs_data_shieldsio.json')
  .then(res => res.json())
  .then(data => {
    const canvas = document.getElementById("citationsSidebar");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const years = data.citations_by_year.map(item => item.year);
    const values = data.citations_by_year.map(item => item.citations);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          data: values,
          backgroundColor: 'rgba(0, 123, 255, 0.6)'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { display: false }, grid: { display: false } },
          x: { ticks: { font: { size: 10 } } }
        },
        responsive: false,
        maintainAspectRatio: false
      }
    });
  });
