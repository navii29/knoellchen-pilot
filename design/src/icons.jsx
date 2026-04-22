// Simple Icon component using lucide UMD.
// Renders an <i data-lucide="..."> and calls lucide.createIcons() after mount.
const Icon = ({ name, size = 20, className = '', strokeWidth = 1.75, style }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !window.lucide) return;
    ref.current.innerHTML = `<i data-lucide="${name}" style="width:${size}px;height:${size}px;stroke-width:${strokeWidth}"></i>`;
    try { window.lucide.createIcons({ attrs: { 'stroke-width': strokeWidth }, nameAttr: 'data-lucide' }); } catch (e) {}
    // size on resulting svg
    const svg = ref.current.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('stroke-width', strokeWidth);
    }
  }, [name, size, strokeWidth]);
  return <span ref={ref} className={`inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size, lineHeight: 0, ...style }} />;
};

window.Icon = Icon;
