import { useState, useEffect } from "react";
import "./History.css";
import { useLanguage } from "../contexts/LanguageContext";
import { useReader } from "../contexts/ReaderContext";
import { getAllHistoryEntries } from "../services/historyService";

function History() {
    const { t } = useLanguage();
    const { openFileFromHistory } = useReader();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        getAllHistoryEntries()
            .then((result) => {
                if (!active) return;
                const sorted = [...result].sort(
                    (a, b) => b.lastOpened - a.lastOpened
                );
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
        openFileFromHistory(entry);
    }

    return (
        <section className="history">
            <h2>
                {t("history")}
            </h2>

            <div className="history-content">
                {!loading && entries.length === 0 && (
                    <p>{t("noBooks")}</p>
                )}

                {entries.length > 0 && (
                    <div className="history-grid">
                        {entries.map((entry) => (
                            <button
                                key={entry.id}
                                className="history-item"
                                onClick={() => handleOpen(entry)}
                                title={entry.fileName}
                            >
                                <img
                                    src={entry.thumbnail}
                                    alt=""
                                    className="history-thumbnail"
                                />
                                <span className="history-name">
                                    {entry.fileName}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default History;