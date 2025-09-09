// --- app.js (REVISADO COMPLETO PARA VERSÃO MODULAR DO FIREBASE) ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { createExpenseChart, updateExpenseChart } from './chart-setup.js';

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQeYc0Y-eYONv3ZfvZoJEzOjoKR371P-Y",
    authDomain: "controle-financeiro-65744.firebaseapp.com",
    projectId: "controle-financeiro-65744",
    storageBucket: "controle-financeiro-65744.appspot.com",
    messagingSenderId: "587527394934",
    appId: "1:587527394934:web:c142740ef0139a5cf63157",
    measurementId: "G-RT2T1HNV4G"
  };

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const ref = collection(db, 'transacoes');
let currentUid = null;
let unsubscribers = [];

document.addEventListener('DOMContentLoaded', () => {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'dark') document.body.classList.add('dark-theme');

    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const addButton = document.getElementById('add-transaction-btn');
    const transactionModal = document.getElementById('transaction-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const transactionForm = document.getElementById('transaction-form');
    const typeExpenseBtn = document.getElementById('type-expense-btn');
    const typeIncomeBtn = document.getElementById('type-income-btn');
    const transactionTypeInput = document.getElementById('transaction-type');
    const categorySelect = document.getElementById('category');
    const transactionModalTitle = document.getElementById('transaction-modal-title');
    const transactionIdInput = document.getElementById('transaction-id');
    const deleteTransactionBtn = document.getElementById('delete-transaction-btn');
    const perfilTrigger = document.querySelector('.profile-trigger');
    const menuBotao = document.getElementById('menu-botao');
    const menuFlutuante = document.getElementById('menu-perfil');

    const transBtn = document.getElementById("transBtn");
    const transContainer = document.getElementById("transContainer");
    const perfBtn = document.getElementById("perfBtn");
    const perfContainer = document.getElementById("perfContainer");

    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalModal = document.getElementById('goal-modal');
    const cancelGoalBtn = document.getElementById('cancel-goal-btn');
    const goalForm = document.getElementById('goal-form');
    const goalList = document.getElementById('goal-list');
    const userButtons = document.querySelectorAll('.user-buttons button');
    const currentUserNameEl = document.getElementById('current-user-name');
    const exportDataBtn = document.getElementById('export-data-btn');
    const chartBtns = document.querySelectorAll('.chart-btn');
    const chartTitle = document.getElementById('chart-title');

    const addPayableBtn = document.getElementById('add-payable-btn');
    const payableModal = document.getElementById('payable-modal');
    const cancelPayableBtn = document.getElementById('cancel-payable-btn');
    const payableForm = document.getElementById('payable-form');
    const payableList = document.getElementById('payable-list');

    // elementos da tela de login
    const authEmail      = document.getElementById('auth-email');
    const authPassword   = document.getElementById('auth-password');
    const loginEmailBtn  = document.getElementById('btn-login-email');
    const signupEmailBtn = document.getElementById('btn-signup-email');
    const resetBtn       = document.getElementById('btn-reset');
    const loginGoogleBtn = document.getElementById('btn-login-google');

    const state = {
        transactions: JSON.parse(localStorage.getItem('transactions')) ||
            [],
        goals: JSON.parse(localStorage.getItem('goals')) || [],
        payables: JSON.parse(localStorage.getItem('payables')) ||
            [],
        currentUser: localStorage.getItem('currentUser') || 'Bem Vindo',
        users: ['Esposo', 'Esposa'],
        currentDate: new Date(),
        expenseCategories: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Empréstimo', 'Cartão de Crédito', 'Energia', 'Água', 'Gás', 'Internet', 'Investimento', 'Outros'],
        incomeCategories: ['Salário', 'Combustível', 'Aluguel', 'Outros'],
        chartType: 'all'
    };

    createExpenseChart();
    setCurrentDate();
    updateAll();
    registerServiceWorker();

    onAuthStateChanged(auth, (user) => {
  const isLogin = window.location.pathname.endsWith('login.html');
  if (user) {
    if (isLogin) return window.location.href = 'index.html';
    // aqui sua lógica de "esconder modal" na página principal
  } else {
    if (!isLogin) return window.location.href = 'login.html';
  }
});

    // garantir que signOut e auth estão importados e disponíveis no app.js
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await signOut(auth);
          // após signOut, onAuthStateChanged tratará o estado (app.js já tem onAuthStateChanged)
          window.location.href = 'login.html';
        } catch (err) {
          console.error('Erro ao sair:', err);
          alert('Erro ao sair: ' + (err.message || err));
        }
      });
    }
    
    const loginEmailBtn = document.getElementById('btn-login-email');
    const signupEmailBtn = document.getElementById('btn-signup-email');
    const resetBtn = document.getElementById('btn-reset');
    const loginGoogleBtn = document.getElementById('btn-login-google');

    if (signupEmailBtn) {
        signupEmailBtn.onclick = async () => {
            try {
                const email = document.getElementById('auth-email').value.trim();
                const pass = document.getElementById('auth-password').value;
                await createUserWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                console.error('Erro criar conta:', err);
                alert(err.message || 'Falha ao criar conta.');
            }
        };
    }

    if (resetBtn) {
        resetBtn.onclick = async () => {
            try {
                const email = document.getElementById('auth-email').value.trim();
                if (!email) return alert('Informe seu e-mail para recuperar a senha.');
                await sendPasswordResetEmail(auth, email);
                alert('Enviamos um e-mail de redefinição de senha.');
            } catch (err) {
                console.error('Erro reset senha:', err);
                alert(err.message || 'Falha ao enviar e-mail de redefinição.');
            }
        };
    }

    async function firstCloudSync() {
        if (!currentUid) return;
        const pull = async (name) => {
            const snap = await getDocs(collection(db, 'users', currentUid, name));
            return snap.docs.map(d => d.data());
        };

        const [remoteTx, remoteGoals, remotePay] = await Promise.all([
            pull('transactions'), pull('goals'), pull('payables')
        ]);
        if (remoteTx.length + remoteGoals.length + remotePay.length > 0) {
            state.transactions = remoteTx;
            state.goals = remoteGoals;
            state.payables = remotePay;
            localStorage.setItem('transactions', JSON.stringify(state.transactions));
            localStorage.setItem('goals', JSON.stringify(state.goals));
            localStorage.setItem('payables', JSON.stringify(state.payables));
        }
        updateAll();
    }

    function startRealtimeSync() {
        stopRealtimeSync();
        if (!currentUid) return;

        const listen = (name, apply) => onSnapshot(
            collection(db, 'users', currentUid, name),
            (snap) => {
                const arr = snap.docs.map(d => d.data());
                apply(arr);
                if (name === 'transactions')
                    localStorage.setItem('transactions', JSON.stringify(state.transactions));
                if (name === 'goals')
                    localStorage.setItem('goals', JSON.stringify(state.goals));
                if (name === 'payables')
                    localStorage.setItem('payables', JSON.stringify(state.payables));
                updateAll();
            }
        );
        unsubscribers = [
            listen('transactions', arr => state.transactions = arr),
            listen('goals', arr => state.goals = arr),
            listen('payables', arr => state.payables = arr)
        ];
    }

    function stopRealtimeSync() {
        unsubscribers.forEach(fn => fn && fn());
        unsubscribers = [];
    }

    function setCurrentDate() {
        const el = document.getElementById('current-month-year');
        if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    function updateAll() {
        updateExpenseChart();
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(console.error);
        }
    }

    async function saveAndRerender() {
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('goals', JSON.stringify(state.goals));
        localStorage.setItem('payables', JSON.stringify(state.payables));
        if (currentUid) await saveAllToCloud();
        updateAll();
    }

    async function saveAllToCloud() {
        if (!currentUid) return;
        const batch = writeBatch(db);
        const putAll = (name, arr) => {
            const colRef = collection(db, 'users', currentUid, name);
            arr.forEach(item => {
                const ref = doc(colRef, String(item.id));
                batch.set(ref, item, { merge: true });
            });
        };

        putAll('transactions', state.transactions);
        putAll('goals', state.goals);
        putAll('payables', state.payables);

        await batch.commit();
    }

    menuBotao && menuBotao.addEventListener('click', () => {
        menuFlutuante.style.display = menuFlutuante.style.display === 'none' ? 'block' : 'none';
    });
    if (transBtn && transContainer && perfBtn && perfContainer) {
        transBtn.addEventListener('click', () => {
            transContainer.style.display = "block";
            perfContainer.style.display = "none";
        });
        perfBtn.addEventListener('click', () => {
            transContainer.style.display = "none";
            perfContainer.style.display = "block";
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            if (pageId) navigateToPage(pageId);
        });
    });

    function navigateToPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        const selectedPage = document.getElementById(pageId);
        if (selectedPage) selectedPage.classList.add('active');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) item.classList.add('active');
        });
        const titles = {
            'dashboard-page': 'Visão Geral',
            'goals-page': 'Metas Pessoais',
            'payables-page': 'Despesas a Pagar',
            'menu-page': 'Menu',
            'resumo-anual-page': 'Resumo Anual',
            'config-page': 'Configurações'
        };
        document.querySelector('.app-header h1').textContent = titles[pageId] || 'Visão Geral';
        if (pageId === 'payables-page') renderPayables();
        if (pageId === 'dashboard-page') {
            carregarResumoMensal();
            atualizarNomeDoMes();
        }
    }

    function openModal(modal) {
        if (modal) modal.classList.add('active');
    }

    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    addButton && addButton.addEventListener('click', () => openTransactionModal());
    cancelBtn && cancelBtn.addEventListener('click', () => closeModal(transactionModal));

    deleteTransactionBtn && deleteTransactionBtn.addEventListener('click', () => {
        const id = transactionIdInput.value;
        if (!id) return;
        if (confirm("Deseja excluir esta transação?")) {
            state.transactions = state.transactions.filter(t => t.id !== id);
            saveAndRerender();
            closeModal(transactionModal);
        }
    });

    function abrirPagina(paginaId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(paginaId).classList.add('active');
        if (menuFlutuante) menuFlutuante.style.display = 'none';
    }

    function abrirResumoAnual() {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('resumo-anual-page').classList.add('active');
        if (menuFlutuante) menuFlutuante.style.display = 'none';
        const transacoes = state.transactions;
        const receitaTotal = transacoes.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const despesaTotal = transacoes.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
        const saldoTotal = receitaTotal - despesaTotal;
        document.getElementById("annual-revenue").textContent = receitaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        document.getElementById("annual-expense").textContent = despesaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        document.getElementById("annual-balance").textContent = saldoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        atualizarGraficoAnual();
    }

    let annualChart = null;

    function inicializarGraficos() {
    const canvas = document.getElementById('main-chart');
    if (canvas) {
        createExpenseChart();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // ... outros inits ...
    inicializarGraficos();
});

    function atualizarGraficoAnual() {
        const canvas = document.getElementById('annual-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const receitas = Array(12).fill(0);
        const despesas = Array(12).fill(0);

        state.transactions.forEach(t => {
            const data = new Date(t.date);
            const mes = data.getMonth();
            const ano = data.getFullYear();
            if (ano === state.currentDate.getFullYear()) {
                if (t.type === "income") receitas[mes] += t.amount;
                if (t.type === "expense") despesas[mes] += t.amount;
            }
        });
        if (annualChart) annualChart.destroy();

        annualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Receita',
                    data: receitas,
                }, {
                    label: 'Despesa',
                    data: despesas
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    function carregarResumoMensal() {
        const mesAtual = state.currentDate.getMonth();
        const anoAtual = state.currentDate.getFullYear();
        const transacoesDoMes = state.transactions.filter(t => {
            const data = new Date(t.date);
            return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
        });
        const receita = transacoesDoMes.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const despesa = transacoesDoMes.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
        const saldo = receita - despesa;
        const revEl = document.getElementById("monthly-revenue");
        const expEl = document.getElementById("monthly-expense");
        const balEl = document.getElementById("monthly-balance");
        if (revEl) revEl.textContent = receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        if (expEl) expEl.textContent = despesa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        if (balEl) balEl.textContent = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function atualizarNomeDoMes() {
        const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const mes = meses[state.currentDate.getMonth()];
        const ano = state.currentDate.getFullYear();
        const el = document.getElementById("mes-atual");
        if (el) el.textContent = `${mes} de ${ano}`;
    }

    function abrirResumoMensal() {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('resumo-mensal-page').classList.add('active');
        if (menuFlutuante) menuFlutuante.style.display = 'none';
        carregarResumoMensal();
        atualizarNomeDoMes();
        atualizarGraficoMensal();
    }

    document.addEventListener("click", function(event) {
        const menu = document.getElementById("menu-perfil");
        const botaoMenu = document.getElementById("menu-botao");
        if (!menu || !botaoMenu) return;
        const menuVisivel = menu.style.display === "block";
        if (menuVisivel && !menu.contains(event.target) && !botaoMenu.contains(event.target)) {
            menu.style.display = "none";
        }
    });
    
    document.getElementById('resumo-prev-month') && document.getElementById('resumo-prev-month').addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        carregarResumoMensal();
        atualizarNomeDoMes();
        atualizarGraficoMensal();
    });
    document.getElementById('resumo-next-month') && document.getElementById('resumo-next-month').addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        carregarResumoMensal();
        atualizarNomeDoMes();
        atualizarGraficoMensal();
    });

    function atualizarGraficoMensal() {
        const canvas = document.getElementById('monthly-bar-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const receitas = Array(12).fill(0);
        const despesas = Array(12).fill(0);

        state.transactions.forEach(t => {
            const data = new Date(t.date);
            const mes = data.getMonth();
            if (data.getFullYear() === state.currentDate.getFullYear()) {
                if (t.type === "income") receitas[mes] += t.amount;
                if (t.type === "expense") despesas[mes] += t.amount;
            }
        });
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Receita',
                    data: receitas
                }, {
                    label: 'Despesa',
                    data: despesas
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    function abrirConfig() {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('config-page').classList.add('active');
        if (menuFlutuante) menuFlutuante.style.display = 'none';
    }

    function exportarDados() {
        const dados = {
            transacoes: state.transactions,
            metas: state.goals,
            contas: state.payables
        };
        const blob = new Blob([JSON.stringify(dados, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dados-financeiros.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function trocarTema() {
        const body = document.body;
        const isDark = body.classList.toggle('dark-theme');
        localStorage.setItem('tema', isDark ? 'dark' : 'light');
    }

    function resetarApp() {
        if (confirm("Tem certeza que deseja apagar todos os dados e reiniciar o aplicativo?")) {
            localStorage.clear();
            location.reload();
        }
    }

    window.abrirAlerta = function() {
        const m = document.getElementById('alert-modal');
        if (m) m.classList.add('active');
    };
    window.fecharAlerta = function() {
        const m = document.getElementById('alert-modal');
        if (m) m.classList.remove('active');
    };

    function diasRestantes(dataVencimento) {
        const hoje = new Date();
        const vencimento = new Date(dataVencimento);
        const diff = vencimento - hoje;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function verificarContasAVencer() {
        const proximas = state.payables.filter(c => {
            const dias = diasRestantes(c.date);
            return dias >= 0 && dias <= 5;
        });
        const alertCount = document.getElementById('alert-count');
        const alertList = document.getElementById('alert-list');
        const alertIcon = document.getElementById('alert-icon');

        if (alertCount) alertCount.textContent = proximas.length;
        if (alertIcon) alertIcon.classList.toggle('ativo', proximas.length > 0);

        if (alertList) {
            alertList.innerHTML = proximas.length ?
                proximas.map(c => {
                    const dataFormatada = new Date(c.date).toLocaleDateString('pt-BR');
                    return `<li>${c.description} - vence em ${dataFormatada}</li>`;
                }).join('') : "<li>Nenhuma conta próxima do vencimento</li>";
        }
    }

    verificarContasAVencer();

    payableForm && payableForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('payable-id').value || Date.now().toString();
        const payable = {
            id,
            description: document.getElementById('payable-description').value,
            category: document.getElementById('payable-category').value,
            amount: parseFloat(document.getElementById('payable-amount').value),
            date: document.getElementById('payable-date').value,
            paid: false
        };

        const duplicada = state.payables.some(p =>
            p.description === payable.description &&
            p.date === payable.date &&
            p.amount === payable.amount &&
            p.category === payable.category &&
            p.id !== id
        );

        if (duplicada) {
            alert('Essa conta já foi lançada.');
            return;
        }

        const index = state.payables.findIndex(p => p.id === id);
        if (index > -1) {
            state.payables[index] = payable;
        } else {
            state.payables.push(payable);
        }

        saveAndRerender();
        renderPayables();
        verificarContasAVencer();
        closeModal(payableModal);
    });

    document.getElementById('add-payable-btn') && document.getElementById('add-payable-btn').addEventListener('click', () => {
        document.getElementById('payable-id').value = '';
        document.getElementById('payable-form').reset();
        openModal(payableModal);
    });

    function openTransactionModal(transaction = null) {
        transactionForm.reset();
        setCurrentDate();
        transactionIdInput.value = '';
        deleteTransactionBtn.style.display = 'none';
        transactionModalTitle.textContent = transaction ? 'Editar Transação' : 'Nova Transação';
        if (transaction) {
            transactionTypeInput.value = transaction.type;
            setTransactionType(transaction.type);
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('description').value = transaction.description;
            categorySelect.value = transaction.category;
            document.getElementById('date').value = transaction.date;
            transactionIdInput.value = transaction.id;
            deleteTransactionBtn.style.display = 'inline-block';
        } else {
            setTransactionType('expense');
        }
        openModal(transactionModal);
    }

    typeExpenseBtn && typeExpenseBtn.addEventListener('click', () => setTransactionType('expense'));
    typeIncomeBtn && typeIncomeBtn.addEventListener('click', () => setTransactionType('income'));

    function setTransactionType(type) {
        transactionTypeInput.value = type;
        typeExpenseBtn.classList.toggle('active', type === 'expense');
        typeIncomeBtn.classList.toggle('active', type === 'income');
        updateCategoryOptions(type);
    }

    function updateCategoryOptions(type) {
        categorySelect.innerHTML = '';
        const cats = type === 'expense' ?
            state.expenseCategories : state.incomeCategories;
        cats.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    }

    transactionForm && transactionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = transactionIdInput.value;
        const type = transactionTypeInput.value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const category = categorySelect.value;
        const date = document.getElementById('date').value;
        const user = state.currentUser;

        if (!amount || !description || !category || !date) {
            alert('Preencha todos os campos');
            return;
        }

        if (id) {
            const idx = state.transactions.findIndex(t => t.id === id);
            if (idx > -1) {
                state.transactions[idx] = {
                    id,
                    type,
                    amount,
                    description,
                    category,
                    date,
                    user
                };
            }
        } else {
            state.transactions.push({
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                type,
                amount,
                description,
                category,
                date,
                user
            });
        }

        saveAndRerender();
        closeModal(transactionModal);
    });

    chartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chartBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.chartType = btn.getAttribute('data-type');
            updateAll();
        });
    });

    async function saveAndRerender() {
        try {
            localStorage.setItem('transactions', JSON.stringify(state.transactions));
            localStorage.setItem('goals', JSON.stringify(state.goals));
            localStorage.setItem('payables', JSON.stringify(state.payables));
            verificarContasAVencer();
            if (currentUid) {
                await saveAllToCloud();
            }
        } catch (err) {
            console.error('Erro ao salvar data:', err);
        } finally {
            updateAll();
        }
    }

    function updateAll() {
        const monthFiltered = filterTransactionsByMonth(state.transactions, state.currentDate);
        let transactionsForDisplay = monthFiltered;
        if (state.chartType === 'expense') transactionsForDisplay = monthFiltered.filter(t => t.type === 'expense');
        else if (state.chartType === 'income') transactionsForDisplay = monthFiltered.filter(t => t.type === 'income');

        renderSummary(monthFiltered);
        renderTransactionList(transactionsForDisplay);
        updateMainChart(monthFiltered);
        renderGoals();
        renderPayables();
        updateMonthDisplay();
        updateUserUI();
    }

    function filterTransactionsByMonth(transactions, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return transactions.filter(t => {
            const tDate = new Date(t.date + "T03:00:00");
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
    }

    function updateMainChart(transactions) {
        let cats = state.expenseCategories;
        let filtered = transactions;
        let title = 'Movimentação por Categoria';

        if (state.chartType === 'expense') {
            filtered = transactions.filter(t => t.type === 'expense');
            cats = state.expenseCategories;
            title = 'Despesas por Categoria';
        } else if (state.chartType === 'income') {
            filtered = transactions.filter(t => t.type === 'income');
            cats = state.incomeCategories;
            title = 'Receitas por Categoria';
        }
        updateExpenseChart(filtered, cats);
        chartTitle.textContent = title;
        renderCategorySummary(filtered);
    }

    function renderCategorySummary(transactions) {
        const container = document.getElementById('category-summary');
        if (!container) return;
        container.innerHTML = '';
        const summary = {};
        transactions.forEach(t => {
            if (!summary[t.category]) summary[t.category] = {
                total: 0,
                type: t.type
            };
            summary[t.category].total += t.amount;
        });
        Object.entries(summary).forEach(([category, data]) => {
            const icon = getCategoryIcon(category);
            const card = document.createElement('div');
            card.className = `category-card ${data.type}`;
            card.innerHTML = ` <div class="category-icon"><span class="material-icons-sharp">${icon}</span></div> <div class="category-info"> <span class="category-name">${category}</span> <span class="category-amount">${formatCurrency(data.total)}</span> </div> `;
            container.appendChild(card);
        });
    }

    function getCategoryIcon(category) {
        const icons = {
            'Alimentação': 'restaurant',
            'Transporte': 'directions_bus',
            'Moradia': 'home',
            'Lazer': 'sports_esports',
            'Saúde': 'local_hospital',
            'Empréstimo': 'account_balance',
            'Cartão de Crédito': 'credit_card',
            'Energia': 'bolt',
            'Água': 'water_drop',
            'Gás': 'local_fire_department',
            'Internet': 'wifi',
            'Investimento': 'trending_up',
            'Outros': 'category',
            'Salário': 'attach_money',
            'Combustível': 'local_gas_station',
            'Aluguel': 'business'
        };
        return icons[category] || 'category';
    }

    function renderTransactionList(transactions) {
        const listEl = document.getElementById('transaction-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (transactions.length === 0) {
            listEl.innerHTML = '<li>Nenhuma transação neste filtro.</li>';
            return;
        }
        const sorted = [...transactions].sort((a, b) => new Date(b.date + "T03:00:00") - new Date(a.date + "T03:00:00"));
        sorted.forEach(t => {
            const item = document.createElement('li');
            item.className = 'transaction-item';
            item.dataset.id = t.id;
            const isIncome = t.type === 'income';
            const date = formatDateBR(t.date);
            item.innerHTML = ` <div class="transaction-icon ${isIncome ? 'income' : 'expense'}"> <span class="material-icons-sharp">${isIncome ? 'arrow_upward' : 'arrow_downward'}</span> </div> <div class="transaction-details"> <p>${t.description}</p> <span>${t.category} • ${date}</span> </div> <div class="transaction-amount ${isIncome ? 'income' : 'expense'}"> ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)} </div> `;
            item.addEventListener('click', () => openTransactionModal(t));
            listEl.appendChild(item);
        });
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function formatDateBR(dateStr) {
        return new Date(dateStr + "T03:00:00").toLocaleDateString('pt-BR');
    }

    function renderSummary(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;
        const incomeEl = document.getElementById('month-income');
        const expenseEl = document.getElementById('month-expense');
        const balanceEl = document.getElementById('month-balance');
        if (incomeEl) incomeEl.textContent = formatCurrency(income);
        if (expenseEl) expenseEl.textContent = formatCurrency(expense);
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(balance);
            balanceEl.style.color = balance >= 0 ? 'var(--text-light)' : '#ff8a80';
        }
    }

    function updateMonthDisplay() {
        const el = document.getElementById('current-month-year');
        if (!el) return;
        el.textContent = state.currentDate.toLocaleString('pt-BR', {
            month: 'long',
            year: 'numeric'
        });
    }

    goalForm && goalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const goalId = document.getElementById('goal-id').value;
        const goalData = {
            name: document.getElementById('goal-name').value,
            target: parseFloat(document.getElementById('goal-target').value),
            current: parseFloat(document.getElementById('goal-current').value),
            date: document.getElementById('goal-date').value
        };
        if (!goalData.name || !goalData.target || isNaN(goalData.current)) {
            alert('Por favor, preencha todos os campos corretamente');
            return;
        }
        if (goalId) {
            const index = state.goals.findIndex(g => g.id === goalId);
            if (index !== -1) state.goals[index] = { ...state.goals[index],
                ...goalData
            };
        } else {
            state.goals.push({
                id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                ...goalData
            });
        }
        saveAndRerender();
        closeGoalModal();
    });

    document.getElementById('delete-goal-btn') && document.getElementById('delete-goal-btn').addEventListener('click', function() {
        const goalId = document.getElementById('goal-id').value;
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            state.goals = state.goals.filter(g => g.id !== goalId);
            saveAndRerender();
            closeModal(goalModal);
        }
    });

    window.editGoal = function(goalId) {
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal) return;
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        document.getElementById('goal-date').value = goal.date;
        document.getElementById('goal-modal-title').textContent = 'Editar Meta';
        document.getElementById('delete-goal-btn').style.display = 'block';
        openModal(goalModal);
    };
    window.closeGoalModal = function() {
        closeModal(goalModal);
        goalForm.reset();
        document.getElementById('goal-id').value = '';
        document.getElementById('goal-modal-title').textContent = 'Nova Meta Financeira';
        document.getElementById('delete-goal-btn').style.display = 'none';
    };

    userButtons.forEach(button => {
        button.addEventListener('click', () => {
            state.currentUser = button.dataset.user;
            localStorage.setItem('currentUser', state.currentUser);
            updateAll();
        });
    });

    exportDataBtn && exportDataBtn.addEventListener('click', exportarDados);

    function exportData() {
        const data = {
            transactions: state.transactions,
            goals: state.goals,
            payables: state.payables
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "dados_financeiros.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function openPayableModal(payable = null) {
        payableForm.reset();
        document.getElementById('payable-id').value = '';
        document.getElementById('payable-modal-title').textContent = payable ?
            'Editar Conta a Pagar' : 'Nova Conta a Pagar';
        if (payable) {
            document.getElementById('payable-id').value = payable.id;
            document.getElementById('payable-description').value = payable.description;
            document.getElementById('payable-category').value = payable.category;
            document.getElementById('payable-amount').value = payable.amount;
            document.getElementById('payable-date').value = payable.date;
        }
        openModal(payableModal);
    }
    window.markPayablePaid = function(id) {
        const idx = state.payables.findIndex(p => p.id === id);
        if (idx > -1) {
            state.payables[idx].paid = true;
            saveAndRerender();
        }
    };

    window.editPayable = function(id) {
        const payable = state.payables.find(p => p.id === id);
        if (!payable) return;
        openPayableModal(payable);
    };

    window.deletePayable = function(id) {
        if (confirm("Tem certeza que deseja excluir esta conta?")) {
            state.payables = state.payables.filter(p => p.id !== id);
            saveAndRerender();
        }
    };

    function renderPayables() {
        if (!payableList) return;
        payableList.innerHTML = '';
        const sorted = [...state.payables].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(p => {
            const isPaid = p.paid;
            const daysLeft = diasRestantes(p.date);
            const isLate = daysLeft < 0 && !isPaid;
            const statusClass = isPaid ? 'paid' : (isLate ? 'late' : 'pending');
            const statusText = isPaid ? 'Paga' : (isLate ? 'Atrasada' : 'A pagar');
            const item = document.createElement('li');
            item.className = `payable-item ${statusClass}`;
            item.innerHTML = `
            <div class="payable-info">
                <h3>${p.description}</h3>
                <p>Valor: ${formatCurrency(p.amount)} | Vence em: ${formatDateBR(p.date)}</p>
            </div>
            <div class="payable-actions">
                <span class="payable-status">${statusText}</span>
                <button class="icon-btn" onclick="editPayable('${p.id}')">
                    <span class="material-icons-sharp">edit</span>
                </button>
                <button class="icon-btn" onclick="deletePayable('${p.id}')">
                    <span class="material-icons-sharp">delete</span>
                </button>
                ${!isPaid ? `<button class="icon-btn" onclick="markPayablePaid('${p.id}')">
                    <span class="material-icons-sharp">done</span>
                </button>` : ''}
            </div>
        `;
            payableList.appendChild(item);
        });
    }

    function renderGoals() {
        if (!goalList) return;
        goalList.innerHTML = '';
        state.goals.forEach(goal => {
            const progress = (goal.current / goal.target) * 100;
            const item = document.createElement('li');
            item.className = 'goal-item';
            item.innerHTML = `
            <h3>${goal.name}</h3>
            <p>Meta: ${formatCurrency(goal.target)} | Atual: ${formatCurrency(goal.current)}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(100, progress)}%;"></div>
            </div>
            <span>${progress.toFixed(0)}%</span>
            <button class="icon-btn" onclick="editGoal('${goal.id}')">
                <span class="material-icons-sharp">edit</span>
            </button>
        `;
            goalList.appendChild(item);
        });
    }

    function updateUserUI() {
        const logoutBtn = document.getElementById('btn-logout');
        const loginNameEl = document.getElementById('login-name');
        
        if (auth.currentUser) {
          if (loginNameEl) loginNameEl.textContent = auth.currentUser.email;
          if (logoutBtn) logoutBtn.style.display = 'inline';
        } else {
          if (loginNameEl) loginNameEl.textContent = 'Não Autenticado';
          if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    document.getElementById('btn-logout') && document.getElementById('btn-logout').addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.clear();
            location.reload();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            alert('Erro ao fazer logout.');
        }
    });
});
