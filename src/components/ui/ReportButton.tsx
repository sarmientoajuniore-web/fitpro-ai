const WA_REPORTE =
  'https://wa.me/56934580344?text=Hola!%20PorotoFit%20est%C3%A1%20en%20prueba.%20Quiero%20reportar%20esto%3A%20'

export default function ReportButton() {
  return (
    <a
      href={WA_REPORTE}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: 16,
        // En móvil (viewport ≤ 32rem): right = 16px
        // En desktop: right = (100vw - 32rem) / 2 + 16px  → pegado al borde derecho del contenedor max-w-lg
        right: 'max(16px, calc((100vw - 32rem) / 2 + 16px))',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 999,
        background: 'rgba(37,211,102,0.13)',
        border: '1px solid #25D366',
        color: '#25D366',
        fontSize: 12,
        fontWeight: 700,
        boxShadow: '0 2px 14px rgba(37,211,102,0.22)',
        textDecoration: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      🐛 Reportar
    </a>
  )
}
