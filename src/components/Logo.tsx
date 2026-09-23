import { useState } from 'react'

// Logo de Algo Nuestro: se lee de public/logo.png.
// Si el archivo todavía no está, se muestra el nombre en letra serif.
export function Logo({ claro = false, className }: { claro?: boolean; className?: string }) {
  const [falta, setFalta] = useState(false)
  if (falta) return <span className={`marca-texto ${className ?? ''}`}>Algo Nuestro</span>
  return (
    <img
      src="/logo.png"
      alt="Algo Nuestro"
      className={className}
      // En la cabecera (fondo chocolate) el logo se muestra en color crema.
      style={claro ? { filter: 'brightness(0) invert(95%) sepia(8%) saturate(300%)' } : undefined}
      onError={() => setFalta(true)}
    />
  )
}
