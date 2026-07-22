import "./SearchButton.css";
import { useReader } from "../contexts/ReaderContext";

function SearchIcon() {
  return (
    <svg className="icon-svg" width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="2.4" />
      <line x1="15" y1="15" x2="20.5" y2="20.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function SearchButton() {
  const { openFile } = useReader();

  function openFileSelector() {
    document
      .getElementById("pdf-file-input")
      .click();
  }

  function handleFileSelected(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Verifica se é PDF
    if (file.type !== "application/pdf") {
      alert("Selecione um arquivo PDF.");
      return;
    }

    // Envia o arquivo para o ReaderContext
    openFile(file);

    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = "";
  }

  return (
    <>
      <button
        className="search-button"
        onClick={openFileSelector}
        title="Abrir arquivo PDF"
      >
        <SearchIcon />
      </button>

      <input
        id="pdf-file-input"
        type="file"
        accept="application/pdf"
        onChange={handleFileSelected}
        hidden
      />
    </>
  );
}

export default SearchButton;