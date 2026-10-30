(function (root) {
  const normalize = value => value.trim().toLocaleLowerCase('en-US').replace(/^[“”"'‘’.,!?;:()]+|[“”"'‘’.,!?;:()]+$/g, '').replace(/\s+/g, ' ');
  const isLookup = value => /^[a-zA-Z][a-zA-Z'’ -]{0,79}$/.test(normalize(value)) && normalize(value).split(' ').length <= 5;
  const links = word => ({
    oxford: `https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(word)}`,
    cambridge: `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word.replace(/ /g, '-'))}`,
    turkish: `https://dictionary.cambridge.org/dictionary/english-turkish/${encodeURIComponent(word.replace(/ /g, '-'))}`
  });
  const position = (rect, width, height, viewport) => {
    const pad = 12;
    const right = rect.right + 14;
    const left = right + width <= viewport.width - pad ? right : rect.left - width - 14 >= pad ? rect.left - width - 14 : Math.max(pad, Math.min(rect.left, viewport.width - width - pad));
    const top = Math.max(pad, Math.min(rect.top - 20, viewport.height - height - pad));
    return { left, top };
  };
  root.SozlookCore = { normalize, isLookup, links, position };
})(globalThis);
