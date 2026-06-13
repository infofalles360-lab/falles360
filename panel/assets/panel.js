(() => {
  const shell = document.querySelector('.app-shell');
  document.querySelector('[data-sidebar-toggle]')?.addEventListener('click', () => shell?.classList.toggle('is-sidebar-open'));
  document.querySelector('[data-sidebar-overlay]')?.addEventListener('click', () => shell?.classList.remove('is-sidebar-open'));
  const confirmDialog = document.getElementById('confirm-dialog');
  const confirmMessage = confirmDialog?.querySelector('[data-confirm-message]');
  const confirmAccept = confirmDialog?.querySelector('[data-confirm-accept]');
  const confirmCancel = confirmDialog?.querySelector('[data-confirm-cancel]');
  let pendingConfirmForm = null;

  document.querySelectorAll('[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (form.dataset.confirmed === 'true') {
        delete form.dataset.confirmed;
        return;
      }

      event.preventDefault();
      pendingConfirmForm = form;
      if (confirmMessage) confirmMessage.textContent = form.getAttribute('data-confirm') || 'Quieres continuar?';
      if (confirmDialog?.showModal) {
        confirmDialog.showModal();
      }
    });
  });

  confirmAccept?.addEventListener('click', () => {
    if (!pendingConfirmForm) return;
    pendingConfirmForm.dataset.confirmed = 'true';
    confirmDialog?.close();
    pendingConfirmForm.requestSubmit();
  });

  confirmCancel?.addEventListener('click', () => {
    pendingConfirmForm = null;
    confirmDialog?.close();
  });

  confirmDialog?.addEventListener('close', () => {
    pendingConfirmForm = null;
  });
  const dialog = document.getElementById('preview-dialog');
  document.querySelector('[data-preview]')?.addEventListener('click', () => {
    const form = document.querySelector('.form-panel form');
    const target = document.querySelector('[data-preview-content]');
    if (!form || !target || !dialog) return;
    const data = new FormData(form);
    target.innerHTML = Array.from(data.entries()).filter(([key]) => !key.startsWith('csrf') && key !== 'panel_action').map(([key, value]) => `<p><strong>${key}</strong><br>${String(value).replace(/[<>]/g, '')}</p>`).join('');
    dialog.showModal();
  });
  document.querySelector('[data-close-preview]')?.addEventListener('click', () => dialog?.close());
})();
