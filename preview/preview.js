document.querySelector('#try-word').addEventListener('click', () => {
  const word = document.querySelector('#reliable');
  if (word.getBoundingClientRect().top > innerHeight - 150) {
    word.scrollIntoView({ block: 'center', behavior: 'instant' });
    requestAnimationFrame(() => requestAnimationFrame(() => window.SozlookPreview.open('reliable', word)));
  } else window.SozlookPreview.open('reliable', word);
});
