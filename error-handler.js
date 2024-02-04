const $msgBox = $('#msgBox');

function handleError(msg) {
  console.log(msg);
  showError(msg.message);
}

function hideMsgSlowly() {
  $msgBox.fadeOut(2000);
}

function showInfo(msg) {
  $msgBox.show();
  if (!$msgBox.hasClass('alert-primary')) {
    $msgBox.addClass('alert-primary');
  }
  $msgBox.removeClass('alert-danger');
  $msgBox.text(msg);
  hideMsgSlowly();
}

function showError(err) {
  $msgBox.show();
  if (!$msgBox.hasClass('alert-danger')) {
    $msgBox.addClass('alert-danger');
  }
  $msgBox.removeClass('alert-primary');
  $msgBox.text(err);
  hideMsgSlowly();
}

function handleHttpErrors(res, err) {
  if (res.status < 500) {
    showError(err.message);
  } else {
    showError("Server error");
    console.log(err.message);
  }
}