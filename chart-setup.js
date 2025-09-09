let chartInstance;
let lastTransactions = [];

/**
 * Cria o gráfico de despesas/receitas por categoria.
 * Deve ser chamado apenas uma vez na inicialização do app.
export function createExpenseChart() {
    const canvas = document.getElementById('main-chart');
    if (!canvas) {
        console.warn('Elemento #main-chart não encontrado. Gráfico não será renderizado.');
        return;
    }

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
},
        options: {
            plugins: { legend: { position: 'bottom' } },
            onClick: chartClickHandler
        }
    });
}

/**
 * Atualiza o gráfico conforme os dados filtrados.
 * Não perde dados já lançados - só atualiza a visualização.
 * @param {Array} transactions - Array de lançamentos (filtrados por mês ou tipo)
 * @param {Array} categories - Array de categorias (despesa ou receita)
 */
export function updateExpenseChart(transactions, categories) {
    if (!chartInstance) return;
    lastTransactions = transactions;
    const data = categories.map(cat =>
        transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
    );
    chartInstance.data.labels = categories;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
}

/**
 * Handler para clique em fatia do gráfico.
 * Mostra detalhes dos lançamentos da categoria clicada.
 */
function chartClickHandler(evt, elements) {
    if (!elements.length) return;
    const idx = elements[0].index;
    const cat = chartInstance.data.labels[idx];
    const filtered = lastTransactions.filter(t => t.category === cat);
    if (typeof window.showChartDetails === "function") {
        window.showChartDetails(cat, filtered);
    }
}
