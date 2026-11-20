
const storageKey = 'savedAccount';
const apiUrl = 'http://localhost:5000/api/accounts';

// APP STATE
let state = Object.freeze({
  account: null
});

// ROUTES
const routes = {
  '/login': { templateId: 'login' },
  '/dashboard': {
    templateId: 'dashboard',
    init: refresh
  },
  '/credits': { templateId: 'credits' }
};

// UPDATE ROUTE
function updateRoute() {
  const path = window.location.pathname;
  const route = routes[path];

  if (!route) {
    return navigate('/dashboard');
  }

  const template = document.getElementById(route.templateId);
  const view = template.content.cloneNode(true);
  const app = document.getElementById('app');

  app.innerHTML = '';
  app.appendChild(view);

  if (typeof route.init === 'function') {
    route.init();
  }
}

// NAVIGATION
function navigate(path) {
  window.history.pushState({}, '', path);
  updateRoute();
}

function onLinkClick(event) {
  event.preventDefault();
  navigate(event.currentTarget.getAttribute('href'));
}

function onLogoutClick(event) {
  event.preventDefault();
  logout();
}

// UPDATE HTML ELEMENTS
function updateElement(id, textOrNode) {
  const element = document.getElementById(id);

  if (!element) return;

  element.textContent = '';
  element.append(textOrNode ?? '');
}

// CREATE ACCOUNT USING API
async function createAccount(account) {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: account
    });

    const result = await response.json();

    if (!response.ok && !result.error) {
      return { error: 'Could not create account' };
    }

    return result;
  } catch (error) {
    return {
      error: error.message || 'Unknown error'
    };
  }
}

// REGISTER
async function register() {
  const registerForm = document.getElementById('registerForm');
  const formData = new FormData(registerForm);

  const jsonData = JSON.stringify(
    Object.fromEntries(formData)
  );

  const result = await createAccount(jsonData);

  if (result.error) {
    updateElement('registerError', result.error);
    return;
  }

  console.log('Account created!', result);
  updateState('account', result);
  navigate('/dashboard');
}

// GET ACCOUNT FROM API
async function getAccount(user) {
  try {
    const response = await fetch(
      apiUrl + '/' + encodeURIComponent(user)
    );

    const result = await response.json();

    if (!response.ok && !result.error) {
      return { error: 'Account not found' };
    }

    return result;
  } catch (error) {
    return {
      error: error.message || 'Unknown error'
    };
  }
}

// LOGIN
async function login() {
  const loginForm = document.getElementById('loginForm');
  const user = loginForm.elements.namedItem('user').value;

  const data = await getAccount(user);

  if (data.error) {
    updateElement('loginError', data.error);
    return;
  }

  updateState('account', data);
  navigate('/dashboard');
}

// CREATE TRANSACTION TABLE ROW
function createTransactionRow(transaction) {
  const template = document.getElementById('transaction');
  const transactionRow = template.content.cloneNode(true);
  const tr = transactionRow.querySelector('tr');

  tr.children[0].textContent = transaction.date;
  tr.children[1].textContent = transaction.object;
  tr.children[2].textContent =
    Number(transaction.amount).toFixed(2);

  return transactionRow;
}

// UPDATE DASHBOARD
function updateDashboard() {
  const account = state.account;

  if (!account) {
    return navigate('/login');
  }

  updateElement('description', account.description || '');
  updateElement('balance', Number(account.balance).toFixed(2));
  updateElement('currency', account.currency);

  const transactionsRows = document.createDocumentFragment();

  for (const transaction of account.transactions || []) {
    const transactionRow = createTransactionRow(transaction);
    transactionsRows.appendChild(transactionRow);
  }

  updateElement('transactions', transactionsRows);
}

// UPDATE STATE
function updateState(property, newData) {
  state = Object.freeze({
    ...state,
    [property]: newData
  });

  // Save only the username for the next session
  const savedUser = state.account?.user || null;
  localStorage.setItem(storageKey, JSON.stringify(savedUser));
}

// LOGOUT
function logout() {
  updateState('account', null);
  navigate('/login');
}

// REFRESH ACCOUNT DATA
async function updateAccountData() {
  const account = state.account;

  if (!account) {
    return logout();
  }

  const data = await getAccount(account.user);

  if (data.error) {
    return logout();
  }

  updateState('account', data);
}

async function refresh() {
  await updateAccountData();

  if (window.location.pathname === '/dashboard' &&
      state.account) {
    updateDashboard();
  }
}

// INITIALIZE APP
async function init() {
  const savedAccount = localStorage.getItem(storageKey);

  if (savedAccount) {
    try {
      const savedUser = JSON.parse(savedAccount);

      if (typeof savedUser === 'string' && savedUser) {
        const data = await getAccount(savedUser);

        if (!data.error) {
          updateState('account', data);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      localStorage.removeItem(storageKey);
    }
  }

  window.onpopstate = () => updateRoute();
  updateRoute();
}

init();
