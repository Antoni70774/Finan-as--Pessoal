import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore, enableIndexedDbPersistence, collection, doc,
    setDoc, getDocs, onSnapshot, writeBatch, deleteDoc, updateDoc, query, where, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 🔗 Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQeYc0Y-eYONv3ZfvZoJEzOjoKR371P-Y",
    authDomain: "controle-financeiro-65744.firebaseapp.com",
    projectId: "controle-financeiro-65744",
    storageBucket: "controle-financeiro-65744.appspot.com",
    messagingSenderId: "587527394934",
    appId: "1:587527394934:web:c142740ef0139a5cf63157",
    measurementId: "G-RT2T1HNV4G"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Ativa cache offline
(async () => {
    try { await enableIndexedDbPersistence(db); }
    catch (e) { console.warn("IndexedDB não disponível:", e); }
})();

let currentUser = null;
let currentMonth = new Date();
let transactionsData = [];
let goalsData = [];
let payablesData = [];
let myChart;

const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// ----------------------
// 🌍 Funções de Utilidade
// ----------------------

const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');
    closeSidebar();
};

const formatCurrency = (value) => formatter.format(value);
const formatDate = (date) => new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');

const getMonthYearString = (date) => {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
};

const setupChart = () => {
    const ctx = document.getElementById('main-chart').getContext('2d');
    const chartType = 'all';
    const chartTitle = getChartTitle(chartType);
    document.getElementById('chart-title').textContent = chartTitle;
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${tooltipItem.label}: ${formatCurrency(tooltipItem.raw)}`;
                        }
                    }
                }
            }
        }
    });
};

const getChartTitle = (type) => {
    const monthYear = getMonthYearString(currentMonth);
    switch (type) {
        case 'expense':
            return `Despesas por Categoria (${monthYear})`;
        case 'income':
            return `Receitas por Categoria (${monthYear})`;
        default:
            return `Movimentação por Categoria (${monthYear})`;
    }
};

const updateChart = (type = 'all') => {
    const chartTitle = getChartTitle(type);
    document.getElementById('chart-title').textContent = chartTitle;
    let filteredTransactions = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === currentMonth.getFullYear() &&
               transactionDate.getMonth() === currentMonth.getMonth();
    });
    if (type !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === type);
    }
    const categories = {};
    filteredTransactions.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount);
    });
    const labels = Object.keys(categories);
    const data = Object.values(categories);

    const pastelColors = [
        '#A3D5FF', '#FFC1CC', '#C1FFD7', '#FFF5BA',
        '#D5C1FF', '#FFDAC1', '#C1E1FF', '#E2F0CB'
    ];
    const backgroundColors = labels.map((_, i) => pastelColors[i % pastelColors.length]);

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = data;
    myChart.data.datasets[0].backgroundColor = backgroundColors;
    myChart.update();
    renderCategorySummary(categories);
};

const iconMap = {
    // Despesas
    'Alimentação': '🍽️',
    'Transporte': '🚌',
    'Moradia': '🏠',
    'Lazer': '🎉',
    'Saúde': '🩺',
    'Empréstimo': '💳',
    'Cartão de Crédito': '💸',
    'Energia': '🔌',
    'Água': '🚿',
    'Gás': '🔥',
    'Internet': '🌐',
    'Investimento': '📉',
    'Outros': '📦',

    // Receitas
    'Salário': '💼',
    'Combustível': '⛽',
    'Aluguel': '🏢',
    'Outras Entradas': '📦'
};

const renderCategorySummary = (categories) => {
    const summaryDiv = document.getElementById('category-summary');
    summaryDiv.innerHTML = '';
    summaryDiv.style.display = 'grid';
    summaryDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
    summaryDiv.style.gap = '15px';
    for (const category in categories) {
        const item = document.createElement('div');
        item.className = 'summary-item';
        item.style.textAlign = 'center';
        item.innerHTML = `
            <div style="font-size: 1.5rem;">${iconMap[category] ||
'📦'}</div>
            <span>${category}</span>
            <h4>${formatCurrency(categories[category])}</h4>
        `;
        summaryDiv.appendChild(item);
    }
};

const calculateDashboardData = () => {
    let income = 0;
    let expense = 0;
    const filteredTransactions = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === currentMonth.getFullYear() && transactionDate.getMonth() === currentMonth.getMonth();
    });
    filteredTransactions.forEach(t => {
        const amount = parseFloat(t.amount);
        if (t.type === 'income') {
            income += amount;
        } else {
            expense += amount;
        }
    });
    document.getElementById('month-income').textContent = formatCurrency(income);
    document.getElementById('month-expense').textContent = formatCurrency(expense);
    document.getElementById('month-balance').textContent = formatCurrency(income - expense);
};

const renderTransactions = () => {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    const filteredTransactions = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === currentMonth.getFullYear() && transactionDate.getMonth() === currentMonth.getMonth();
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    filteredTransactions.forEach(t => {
        const li = document.createElement('li');
        li.className = 'transaction-item';
        li.setAttribute('data-id', t.id);
        li.innerHTML = `
            <span class="transaction-type ${t.type === 'income' ? 'income' : 'expense'}">${t.type === 'income' ? '+' : '-'}</span>
            <div class="transaction-details">
                <div class="transaction-info">
                    <span class="description">${t.description}</span>
                    <span class="date">${formatDate(t.date)}</span>
                </div>
                <div class="transaction-amount">${formatCurrency(parseFloat(t.amount))}</div>
            </div>
        `;
        li.addEventListener('click', () => editTransaction(t.id));
        list.appendChild(li);
    });
};

const renderGoals = () => {
    const list = document.getElementById('goal-list');
    list.innerHTML = '';
    goalsData.forEach(goal => {
        const progress = (parseFloat(goal.current) / parseFloat(goal.target)) * 100;
        const progressClamped = Math.min(Math.max(progress, 0), 100);
        const item = document.createElement('div');
        item.className = 'goal-item';
        item.setAttribute('data-id', goal.id);
        item.innerHTML = `
            <h4>${goal.name}</h4>
            <div class="goal-amounts">
                <span>Meta: ${formatCurrency(parseFloat(goal.target))}</span>
                <span>Atual: ${formatCurrency(parseFloat(goal.current))}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressClamped}%;"></div>
            </div>
            <span class="goal-progress-text">${progressClamped.toFixed(0)}% (${formatDate(goal.date)})</span>
        `;
        item.addEventListener('click', () => editGoal(goal.id));
        list.appendChild(item);
    });
};

const renderPayables = () => {
  const list = document.getElementById('payable-list');
  list.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  payablesData.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const categoryIcons = {
    'Alimentação': '🍽️',
    'Transporte': '🚌',
    'Moradia': '🏠',
    'Lazer': '🎉',
    'Saúde': '🩺',
    'Empréstimo': '💳',
    'Cartão de Crédito': '💸',
    'Energia': '🔌',
    'Água': '🚿',
    'Gás': '🔥',
    'Internet': '🌐',
    'Investimento': '📉',
    'Outros': '📦'
  };

  payablesData.forEach(payable => {
    const dueDate = new Date(payable.dueDate + 'T00:00:00');
    const isOverdue = dueDate < today && !payable.paid;
    const isToday = dueDate.getTime() === today.getTime();

    const item = document.createElement('div');
    item.className = 'payable-item';
    if (isOverdue) item.classList.add('overdue');
    if (isToday) item.classList.add('due-today');
    item.setAttribute('data-id', payable.id);

    const icon = categoryIcons[payable.category] || '📌';

    item.innerHTML = `
      <div class="payable-details">
        <h4>${icon} ${payable.description}</h4>
        <p><strong>Categoria:</strong> ${payable.category}</p>
        <p><strong>Valor:</strong> ${formatCurrency(parseFloat(payable.amount))}</p>
        <p><strong>Vencimento:</strong> ${formatDate(payable.dueDate)}</p>
      </div>
      <div class="payable-actions">
        <button class="btn-check" data-id="${payable.id}">${payable.paid ? '✅ Pago' : 'Pagar'}</button>
        <button class="btn-edit-payable" data-id="${payable.id}">✏️</button>
        <button class="btn-delete-payable" data-id="${payable.id}">🗑️</button>
      </div>
    `;
    list.appendChild(item);

    // Alternar status de pagamento
    item.querySelector('.btn-check').addEventListener('click', () => {
      payable.paid = !payable.paid;
      renderPayables();
    });

    // Editar conta
    item.querySelector('.btn-edit-payable').addEventListener('click', () => {
      editPayable(payable.id);
    });

    // Excluir conta
    item.querySelector('.btn-delete-payable').addEventListener('click', () => {
      if (confirm("Tem certeza que deseja excluir esta conta?")) {
        const index = payablesData.findIndex(p => p.id === payable.id);
        if (index !== -1) {
          payablesData.splice(index, 1);
          renderPayables();
        }
      }
    });
  });
};

const updateAlertBadge = () => {
    const today = new Date();
    const futurePayables = payablesData.filter(p => !p.paid && new Date(p.dueDate + 'T00:00:00') >= today);
    document.getElementById('alert-count').textContent = futurePayables.length;
};

// ----------------------
// 📦 Ações do Firestore
// ----------------------

const listenForData = () => {
    if (!currentUser) return;
    const user = currentUser;

    const transactionsRef = collection(db, `users/${user.uid}/transactions`);
    onSnapshot(transactionsRef, (snapshot) => {
        transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        refreshDashboard();
    });
    const goalsRef = collection(db, `users/${user.uid}/goals`);
    onSnapshot(goalsRef, (snapshot) => {
        goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGoals();
    });
    const payablesRef = collection(db, `users/${user.uid}/payables`);
    onSnapshot(payablesRef, (snapshot) => {
        payablesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPayables();
        updateAlertBadge();
    });
};

const addTransaction = async (data) => {
    const user = currentUser;
    if (!user) return;
    const newDocRef = doc(collection(db, `users/${user.uid}/transactions`));
    await setDoc(newDocRef, data);
};

const updateTransaction = async (id, data) => {
    const user = currentUser;
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/transactions`, id);
    await updateDoc(docRef, data);
};

const deleteTransaction = async (id) => {
    const user = currentUser;
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/transactions`, id);
    await deleteDoc(docRef);
};

const addGoal = async (data) => {
    const user = currentUser;
    if (!user) return;
    const newDocRef = doc(collection(db, `users/${user.uid}/goals`));
    await setDoc(newDocRef, data);
};

const updateGoal = async (id, data) => {
    const user = currentUser;
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/goals`, id);
    await updateDoc(docRef, data);
};

const deleteGoal = async (id) => {
    const user = currentUser;
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/goals`, id);
    await deleteDoc(docRef);
};

const addPayable = async (data) => {
    const user = currentUser;
    if (!user) return;
    const newDocRef = doc(collection(db, `users/${user.uid}/payables`));
    await setDoc(newDocRef, data);
};

const updatePayable = async (id, data) => {
    const user = currentUser;
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/payables`, id);
    await updateDoc(docRef, data);
};

const markPayableAsPaid = async (id) => {
    const user = currentUser;
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/payables`, id);
    await updateDoc(docRef, { paid: true });
};

// ----------------------
// 🖥️ Lógica da UI
// ----------------------

const populateCategories = () => {
    const select = document.getElementById('category');
    select.innerHTML = '';
    const categories = [
        "Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Educação",
        "Salário", "Freelance", "Rendimentos", "Presentes", "Outros"
    ];
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
};

const openTransactionModal = (transaction = null) => {
  const modal = document.getElementById('transaction-modal');
  const form = document.getElementById('transaction-form');
  const title = document.getElementById('transaction-modal-title');
  const deleteBtn = document.getElementById('delete-transaction-btn');
  form.reset();
  populateCategories();

  if (transaction) {
    title.textContent = 'Editar Transação';
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('description').value = transaction.description;
    document.getElementById('category').value = transaction.category;
    document.getElementById('date').value = transaction.date;
    document.getElementById('transaction-type').value = transaction.type;
    document.getElementById('type-expense-btn').classList.toggle('active', transaction.type === 'expense');
    document.getElementById('type-income-btn').classList.toggle('active', transaction.type === 'income');
    deleteBtn.style.display = 'inline-block';
  } else {
    title.textContent = 'Nova Transação';
    document.getElementById('transaction-id').value = '';
    document.getElementById('transaction-type').value = 'expense';
    document.getElementById('type-expense-btn').classList.add('active');
    document.getElementById('type-income-btn').classList.remove('active');
    deleteBtn.style.display = 'none';
    document.getElementById('date').valueAsDate = new Date();
  }
  modal.classList.add('active');
};

const closeTransactionModal = () => {
    document.getElementById('transaction-modal').classList.remove('active');
};

const editTransaction = (id) => {
    const transaction = transactionsData.find(t => t.id === id);
    if (transaction) {
        openTransactionModal(transaction);
    }
};

const openGoalModal = (goal = null) => {
    const modal = document.getElementById('goal-modal');
    const form = document.getElementById('goal-form');
    const title = document.getElementById('goal-modal-title');
    const deleteBtn = document.getElementById('delete-goal-btn');
    form.reset();

    if (goal) {
        title.textContent = 'Editar Meta';
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        document.getElementById('goal-date').value = goal.date;
        deleteBtn.style.display = 'inline-block';
    } else {
        title.textContent = 'Nova Meta Financeira';
        document.getElementById('goal-id').value = '';
        deleteBtn.style.display = 'none';
    }
    modal.style.display = 'flex';
};

const closeGoalModal = () => {
    document.getElementById('goal-modal').style.display = 'none';
};

const editGoal = (id) => {
    const goal = goalsData.find(g => g.id === id);
    if (goal) {
        openGoalModal(goal);
    }
};

const openPayableModal = (payable = null) => {
    const modal = document.getElementById('payable-modal');
    const form = document.getElementById('payable-form');
    const title = document.getElementById('payable-modal-title');
    form.reset();

    if (payable) {
        title.textContent = 'Editar Conta a Pagar';
        document.getElementById('payable-id').value = payable.id;
        document.getElementById('payable-description').value = payable.description;
        document.getElementById('payable-category').value = payable.category;
        document.getElementById('payable-amount').value = parseFloat(payable.amount);
        document.getElementById('payable-date').value = payable.dueDate;
    } else {
        title.textContent = 'Nova Conta a Pagar';
        document.getElementById('payable-id').value = '';
        document.getElementById('payable-date').valueAsDate = new Date();
    }
    modal.style.display = 'flex';
};

const closePayableModal = () => {
    document.getElementById('payable-modal').style.display = 'none';
};

const editPayable = (id) => {
    const payable = payablesData.find(p => p.id === id);
    if (payable) {
        openPayableModal(payable);
    }
};

const updateMonthlySummary = (date) => {
    const monthYear = getMonthYearString(date);
    document.getElementById('mes-atual').textContent = monthYear;
    document.getElementById('resumo-current-month-year').textContent = monthYear;
    const filtered = transactionsData.filter(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        return transactionDate.getFullYear() === date.getFullYear() && transactionDate.getMonth() === date.getMonth();
    });
    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const balance = income - expense;
    document.getElementById('monthly-revenue').textContent = formatCurrency(income);
    document.getElementById('monthly-expense').textContent = formatCurrency(expense);
    document.getElementById('monthly-balance').textContent = formatCurrency(balance);
};

const renderMonthlyChart = () => {
    const ctx = document.getElementById('monthly-bar-chart').getContext('2d');
    const monthlyData = calculateMonthlyTotals();
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }
    window.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.months,
            datasets: [{
                label: 'Receitas',
                data: monthlyData.incomes,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            }, {
                label: 'Despesas',
                data: monthlyData.expenses,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true }
            }
        }
    });
};

const renderAnnualChart = () => {
    const ctx = document.getElementById('annual-chart').getContext('2d');
    const monthlyData = calculateMonthlyTotals();
    const totalIncome = monthlyData.incomes.reduce((sum, val) => sum + val, 0);
    const totalExpense = monthlyData.expenses.reduce((sum, val) => sum + val, 0);
    const annualBalance = totalIncome - totalExpense;
    document.getElementById('annual-revenue').textContent = formatCurrency(totalIncome);
    document.getElementById('annual-expense').textContent = formatCurrency(totalExpense);
    document.getElementById('annual-balance').textContent = formatCurrency(annualBalance);
    if (window.annualChart) {
        window.annualChart.destroy();
    }
    window.annualChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.months,
            datasets: [{
                label: 'Saldo Mensal',
                data: monthlyData.balances,
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
};

const calculateMonthlyTotals = () => {
    const monthlyTotals = new Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));
    const currentYear = new Date().getFullYear();
    transactionsData.forEach(t => {
        const transactionDate = new Date(t.date + 'T12:00:00-03:00');
        if (transactionDate.getFullYear() === currentYear) {
            const month = transactionDate.getMonth();
            const amount = parseFloat(t.amount);
            if (t.type === 'income') {
                monthlyTotals[month].income += amount;
            } else {
                monthlyTotals[month].expense += amount;
            }
        }
    });
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const incomes = monthlyTotals.map(m => m.income);
    const expenses = monthlyTotals.map(m => m.expense);
    const balances = monthlyTotals.map(m => m.income - m.expense);
    return { months, incomes, expenses, balances };
};

const refreshDashboard = () => {
    document.getElementById('current-month-year').textContent = getMonthYearString(currentMonth);
    calculateDashboardData();
    updateChart();
    renderTransactions();
};

const checkAndDisplayPayableAlerts = () => {
    const alertList = document.getElementById('alert-list');
    alertList.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);
    const upcomingPayables = payablesData.filter(p => {
        const dueDate = new Date(p.dueDate + 'T00:00:00');
        return !p.paid && dueDate >= today && dueDate <= oneWeekFromNow;
    });
    if (upcomingPayables.length > 0) {
        upcomingPayables.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `
                <p><strong>${p.description}</strong></p>
                <p>Valor: ${formatCurrency(parseFloat(p.amount))}</p>
                <p>Vencimento: ${formatDate(p.dueDate)}</p>
            `;
            alertList.appendChild(li);
        });
    } else {
        alertList.innerHTML = '<li>Não há contas a vencer nos próximos 7 dias.</li>';
    }
    updateAlertBadge();
};

const openAlertModal = () => {
    checkAndDisplayPayableAlerts();
    document.getElementById('alert-modal').style.display = 'flex';
};

const closeAlertModal = () => {
    document.getElementById('alert-modal').style.display = 'none';
};

const closeSidebar = () => {
    document.getElementById('menu-perfil').style.display = 'none';
};

const toggleSidebar = () => {
    const sidebar = document.getElementById('menu-perfil');
    sidebar.style.display = sidebar.style.display === 'none' ?
'block' : 'none';
};

// ----------------------
// ⚡ Event Listeners
// ----------------------

// Navegação
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const pageId = btn.getAttribute('data-page');
        if (pageId) {
            showPage(pageId);
        }
    });
});

// Botão FAB para nova transação
document.getElementById('add-transaction-btn').addEventListener('click', () => {
    openTransactionModal();
});

// Botão de logout
document.getElementById('btn-logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "login.html";
});

// Envio do formulário de transação
document.getElementById('transaction-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('transaction-id').value;
  const data = {
    amount: parseFloat(document.getElementById('amount').value),
    description: document.getElementById('description').value,
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
    type: document.getElementById('transaction-type').value,
    createdAt: new Date().toISOString(),
    user: currentUser?.email || 'Desconhecido'
  };

  try {
    if (id) {
      await updateTransaction(id, data);
    } else {
      await addTransaction(data);
    }

    refreshDashboard();
    closeTransactionModal();
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-id').value = '';
    document.getElementById('transaction-type').value = 'expense';
    document.getElementById('type-expense-btn').classList.add('active');
    document.getElementById('type-income-btn').classList.remove('active');

  } catch (error) {
    console.error('Erro ao salvar transação:', error);
    alert('Erro ao salvar. Verifique os dados e tente novamente.');
  }
});

// Botão de deletar transação
document.getElementById('delete-transaction-btn').addEventListener('click', async () => {
    const id = document.getElementById('transaction-id').value;
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        await deleteTransaction(id);
        closeTransactionModal(); // Fecha o modal após a exclusão
    }
});

// Botões de tipo de transação (Despesa/Receita)
document.getElementById('type-expense-btn').addEventListener('click', () => {
    document.getElementById('transaction-type').value = 'expense';
    document.getElementById('type-expense-btn').classList.add('active');
    document.getElementById('type-income-btn').classList.remove('active');
});

document.getElementById('type-income-btn').addEventListener('click', () => {
    document.getElementById('transaction-type').value = 'income';
    document.getElementById('type-expense-btn').classList.remove('active');
    document.getElementById('type-income-btn').classList.add('active');
});

// Botão de cancelamento de modal
document.getElementById('cancel-btn').addEventListener('click', closeTransactionModal);

// Navegação de meses no dashboard
document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    refreshDashboard();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    refreshDashboard();
});

// Filtro de gráfico por tipo
document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateChart(btn.getAttribute('data-type'));
    });
});

// Metas
document.getElementById('add-goal-btn').addEventListener('click', () => openGoalModal());
document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value;
    const data = {
        name: document.getElementById('goal-name').value,
        target: parseFloat(document.getElementById('goal-target').value),
        current: parseFloat(document.getElementById('goal-current').value),
        date: document.getElementById('goal-date').value
    };
    if (id) {
        await updateGoal(id, data);
    } else
 {
        await addGoal(data);
    }
    closeGoalModal();
    document.getElementById('transaction-form').reset();
});

document.getElementById('cancel-goal-btn').addEventListener('click', closeGoalModal);
document.getElementById('delete-goal-btn').addEventListener('click', async () => {
    const id = document.getElementById('goal-id').value;
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
        await deleteGoal(id);
        closeGoalModal();
    }
});

// Contas a Pagar
document.getElementById('add-payable-btn').addEventListener('click', () => openPayableModal());
document.getElementById('payable-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('payable-id').value;
    const data = {
        description: document.getElementById('payable-description').value,
        category: document.getElementById('payable-category').value,
        amount: parseFloat(document.getElementById('payable-amount').value),
        dueDate: document.getElementById('payable-date').value,
        paid: false
    };
    if (id) {
        await updatePayable(id, data);
    } else
 {
        await addPayable(data);
    }
    closePayableModal();
    document.getElementById('payable-form').reset();
});

document.getElementById('cancel-payable-btn').addEventListener('click', closePayableModal);
document.getElementById('payable-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('btn-check')) {
        await markPayableAsPaid(id);
    } else if (btn.classList.contains('btn-edit-payable')) {
        editPayable(id);
    }
});

// Funções do menu lateral
window.abrirResumoMensal = () => {
    showPage('resumo-mensal-page');
    updateMonthlySummary(currentMonth);
    renderMonthlyChart();
};

window.abrirResumoAnual = () => {
    showPage('resumo-anual-page');
    renderAnnualChart();
};

window.abrirPagina = showPage;
window.exportarDados = () => {
    alert('Funcionalidade de exportar dados não implementada.');
};

window.abrirConfig = () => {
    showPage('config-page');
};

window.trocarTema = () => {
    document.body.classList.toggle('dark-theme');
};

window.resetarApp = () => {
    alert('Funcionalidade de resetar app não implementada.');
};

window.abrirAlerta = openAlertModal;
window.fecharAlerta = closeAlertModal;

// Navegação do resumo mensal
document.getElementById('resumo-prev-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    updateMonthlySummary(currentMonth);
});

document.getElementById('resumo-next-month').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    updateMonthlySummary(currentMonth);
});

// Menu lateral
document.getElementById('menu-botao').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
});

document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('menu-perfil');
    const menuBtn = document.getElementById('menu-botao');
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        closeSidebar();
    }
});

// ----------------------
// 🚀 Inicialização
// ----------------------
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        console.log("Usuário logado:", user.email);
        document.getElementById('current-user-name').textContent = user.email; // Atualiza o nome do usuário
        document.getElementById('perfil-usuario').textContent = user.displayName || 'Nome não definido';
        document.getElementById('perfil-email').textContent = user.email;
        listenForData();
        setupChart();
        refreshDashboard();
        // Simulação de conexão bancária
        window.connectBank = (bank) => {
            document.getElementById('perfil-banco').textContent = bank.charAt(0).toUpperCase() + bank.slice(1);
            alert(`Conectado ao ${bank.charAt(0).toUpperCase() + bank.slice(1)}! (Simulado)`);
        };
    } else {
        window.location.href = "login.html";
    }
});
