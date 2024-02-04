const leadersField = document.getElementById('leadersField');

loadLeaders();

async function loadLeaders() {
  const res = await fetch(
    HTTP_ADDRESS + '/auth/get_scores'
  )
  const body = await res.json();
  if (!res.ok) {
    handleHttpErrors(res, body);
    return;
  }
  setLeaders(body);
}

function setLeaders(leaders) {
  for (const l of leaders) {
    const node = document.createElement('tr');
    const th1 = document.createElement('th');
    th1.innerText = l.name;
    const th2 = document.createElement('th');
    th2.innerText = l.bestScore;
    node.appendChild(th1);
    node.appendChild(th2);
    leadersField.appendChild(node);
  }
}