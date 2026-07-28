import { useState, useEffect, useRef } from "react";
import "./History.css";
import { useLanguage } from "../contexts/LanguageContext";
import { useReader } from "../contexts/ReaderContext";
import {
  getAllHistoryEntries,
  deleteHistoryEntry,
} from "../services/historyService";

function History() {
  const { t } = useLanguage();
  const { openFileFromHistory } = useReader();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteMode, setDeleteMode] = useState(null);
  const pressTimer = useRef(null);

  useEffect(() => {
    let active = true;

    getAllHistoryEntries()
      .then((result) => {
        if (!active) return;

        const sorted = [...result].sort((a, b) => b.lastOpened - a.lastOpened);

        setEntries(sorted);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleOpen(entry) {
    if (deleteMode === null) {
      openFileFromHistory(entry);
    }
  }

  function startPress(id) {
    pressTimer.current = setTimeout(() => {
      setDeleteMode(id);
    }, 600);
  }

  function cancelPress() {
    clearTimeout(pressTimer.current);
  }

  async function handleDelete(id) {
    try {
      await deleteHistoryEntry(id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));

      setDeleteMode(null);
    } catch (err) {
      console.error("Erro ao excluir histórico:", err);
    }
  }

  return (
    <section className="history">
      {deleteMode !== null && (
        <div className="delete-overlay" onClick={() => setDeleteMode(null)} />
      )}

      <h2>{t("history")}</h2>

      <div className="history-content">
        {!loading && entries.length === 0 && <p>{t("noBooks")}</p>}

        {entries.length > 0 && (
          <div className="history-grid">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="history-item"
                onMouseDown={() => startPress(entry.id)}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onTouchStart={() => startPress(entry.id)}
                onTouchEnd={cancelPress}
              >
                <div
                  className="history-open"
                  title={entry.fileName}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpen(entry)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleOpen(entry);
                    }
                  }}
                >
                  <img
                    src={entry.thumbnail}
                    alt=""
                    className="history-thumbnail"
                  />

                  <span className="history-name">{entry.fileName}</span>
                </div>

                {deleteMode === entry.id && (
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Excluir"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6H21" />
                      <path d="M8 6V4H16V6" />
                      <path d="M19 6L18 20C17.94 21.1 17.05 22 16 22H8C6.95 22 6.06 21.1 6 20L5 6" />
                      <path d="M10 11V18" />
                      <path d="M14 11V18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default History;
