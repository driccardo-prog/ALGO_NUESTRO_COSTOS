import type { ReactNode } from 'react'

interface Props {
  titulo: string
  children?: ReactNode
  textoConfirmar?: string
  peligro?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Ventanita de confirmación ("¿Seguro que querés borrar…?"). */
export function Confirmar({
  titulo,
  children,
  textoConfirmar = 'Sí, borrar',
  peligro = true,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <div className="fondo-dialogo" onClick={onCancelar}>
      <div className="dialogo" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        {children && <div className="suave">{children}</div>}
        <div className="acciones" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancelar} autoFocus>
            Cancelar
          </button>
          <button
            className={`btn ${peligro ? 'btn-peligro' : 'btn-principal'}`}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
