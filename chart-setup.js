// chart-setup.js

let chartInstance;
let lastTransactions = [];

/**
 * Cria o gráfico de despesas/receitas por categoria.
 * Deve ser chamado apenas uma vez na inicialização do app.
 */
export function createExpenseChart() {
  const canvas = document.getElementById('main-chart');
  if (!canvas) return;   // sai silenciosamente se não houver <canvas id="main-chart">
  const ctx = canvas.getContext('2d');
  chartInstance = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#4A90E2', '#2bc47d', '#ff3d3d',
          '#ffd700', '#ff8a80', '#e6f7ee'
        ]
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      onClick: chartClickHandler
    }
  });
}

/**
 * Atualiza o gráfico conforme os dados filtrados.
 * @param {Array} transactions
 * @param {Array} categories
 */
export function updateExpenseChart(transactions, categories) {
  if (!chartInstance) return;
  lastTransactions = transactions;
  const data = categories.map(cat =>
    transactions.filter(t => t.category === cat)
                .reduce((sum, t) => sum + t.amount, 0)
  );
  chartInstance.data.labels = categories;
  chartInstance.data.datasets[0].data = data;
  chartInstance.update();
}

/**
 * Handler para clique em fatia do gráfico.
 */
function chartClickHandler(evt, elements) {
  if (!elements.length || !chartInstance) return;
  const idx = elements[0].index;
  const category = chartInstance.data.labels[idx];
  const filtered = lastTransactions.filter(t => t.category === category);
  if (typeof window.showChartDetails === 'function') {
    window.showChartDetails(category, filtered);
  }
}
