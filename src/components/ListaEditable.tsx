interface Props {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  textoAgregar?: string
}

/** Lista libre de renglones (diseño exterior, herrajes, etc.). */
export function ListaEditable({ items, onChange, placeholder, textoAgregar = '+ Agregar' }: Props) {
  const cambiar = (i: number, valor: string) =>
    onChange(items.map((x, j) => (j === i ? valor : x)))
  return (
    <div className="lista-editable">
      {items.map((item, i) => (
        <div className="item" key={i}>
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(e) => cambiar(i, e.target.value)}
          />
          <button
            type="button"
            className="btn-x"
            aria-label="Quitar"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn-texto" onClick={() => onChange([...items, ''])}>
          {textoAgregar}
        </button>
      </div>
    </div>
  )
}
