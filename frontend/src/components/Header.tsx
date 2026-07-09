interface Props {
  onUploadClick: () => void;
}

export function Header({ onUploadClick }: Props) {
  return (
    <header className="header">
      <h1>Ventas PyME</h1>
      <button type="button" className="btn-primary" onClick={onUploadClick}>
        Subir ventas
      </button>
    </header>
  );
}
