let userId;

function setAuth() {
  if (!userId) {
    showError("You are not logged in");
    return;
  }
  localStorage.setItem('auth', userId);
}

async function loadAuth() {
  let ui = localStorage.getItem('auth');
  if (ui) {
    const res = await fetch(HTTP_ADDRESS + '/auth/get_user/' + ui);
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 404) {
        removeAuth();
        return;
      }
      handleHttpErrors(res, body);
      return;
    }
    userName.textContent = body.name;  
    console.log(userId);
    userId = +ui;
    state = STATE_HOME;
    conductStates();
  }
}

function removeAuth() {
  localStorage.removeItem('auth');
}

async function logout() {
  if (!userId) {
    showError("You are not logged in");
    return;
  }
  const res = await fetch(
    HTTP_ADDRESS + '/auth/logout',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify({userId})
    }
  );
  if (!res.ok) {
    const err = await res.json();
    handleHttpErrors(res, err);
    return;
  }
  userId = null;
  state = STATE_REG;
  conductStates();
  removeAuth();
}