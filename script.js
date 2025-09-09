// Funções para conexão bancária
function connectBank(bankName) {
    const bankConfigs = {
        nubank: {
            url: 'https://open-banking-nubank.com',
            clientId: 'your-client-id'
        },
        itau: {
            url: 'https://open-banking-itau.com',
            clientId: 'your-client-id'
        },
        caixa: {
            url: 'https://open-banking-caixa.com',
            clientId: 'your-client-id'
        }
    };

    // Implementar integração Open Banking
    alert(`Conexão com ${bankName} em desenvolvimento`);
}

// Funções para gerenciamento de metas
function handleGoalSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const goalData = {
        id: document.getElementById('goal-id').value || Date.now().toString(),
        name: formData.get('goal-name'),
        target: parseFloat(formData.get('goal-target')),
        current: parseFloat(formData.get('goal-current')),
        date: formData.get('goal-date')
    };

    saveGoal(goalData);
    closeGoalModal();
    updateGoalsList();
}

// Prevenir rolagem automática
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('app-main');
    mainContent.addEventListener('scroll', (e) => {
        e.stopPropagation();
    });
});
