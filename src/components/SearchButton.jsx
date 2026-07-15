import "./SearchButton.css";
import { useReader } from "../contexts/ReaderContext";

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

    // Limpa o input para permitir
    // selecionar o mesmo arquivo novamente
    event.target.value = "";
  }

  return (
    <>
      <button
        className="search-button"
        onClick={openFileSelector}
        title="Abrir arquivo PDF"
      >
        🔍
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