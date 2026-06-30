import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { storage } from "@/storage";
import { removeUnusedFields } from "@/utils/removeFields";

type MessageData = {
  contactName: string;
  fullJid: string;
  msgInfo: any;
  bizInfo: any;
  tags: any;
  result: any;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];

function ClearHistoryButton({ onClear }: { onClear: () => void }) {
  const handleClear = () => {
    if (
      window.confirm("Tem certeza que deseja limpar o histórico de mensagens?")
    ) {
      onClear();
    }
  };

  return (
    <button className="clear-button" onClick={handleClear}>
      Limpar Histórico
    </button>
  );
}

function PopupApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    [key: string]: MessageData;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = (await storage.local.get("messages")) as {
          messages?: {
            [key: string]: MessageData;
          };
        };

        setData(response.messages ?? {});
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const listener = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.messages) {
        setData(changes.messages.newValue ?? {});
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const allMessages = useMemo(() => Object.entries(data ?? {}), [data]);
  const totalItems = allMessages.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageStart = (page - 1) * pageSize;
  const paginatedMessages = allMessages.slice(
    currentPageStart,
    currentPageStart + pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize, totalItems]);

  const handlePreviousPage = () => {
    setPage((previousPage) => Math.max(1, previousPage - 1));
  };

  const handleNextPage = () => {
    setPage((previousPage) => Math.min(totalPages, previousPage + 1));
  };

  const handleClear = useCallback(() => {
    storage.local.clear();
  }, []);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Mensagens</h1>
          <p>Monitoramento em tempo real das mensagens processadas.</p>
        </div>
        <span className="counter">{totalItems} registros</span>
      </div>

      {isLoading ? (
        <p className="state">Carregando dados...</p>
      ) : totalItems > 0 ? (
        <>
          <div className="table-wrap">
            <ClearHistoryButton onClear={handleClear} />
            <table className="messages-table">
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Resultado</th>
                  <th>Tags</th>
                  <th>Biz Info</th>
                  <th>Msg Info</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMessages.map(([key, message]) => (
                  <tr key={key}>
                    <td>
                      <p>{message.contactName || "Sem nome"}</p>
                      <span>{message.fullJid}</span>
                    </td>

                    <td>
                      <pre className="result-code">
                        {message.result
                          ? JSON.stringify(removeUnusedFields(message.result), null, 2)
                          : "Sem resultado"}
                      </pre>
                    </td>
                    
                     <td>
                      <pre className="result-code">
                        {message.tags
                          ? JSON.stringify(removeUnusedFields(message.tags), null, 2)
                          : "Sem resultado"}
                      </pre>
                    </td>

                     <td>
                      <pre className="result-code">
                        {message.bizInfo
                          ? JSON.stringify(removeUnusedFields(message.bizInfo), null, 2)
                          : "Sem resultado"}
                      </pre>
                    </td>

                     <td>
                      <pre className="result-code">
                        {message.msgInfo
                          ? JSON.stringify(removeUnusedFields(message.msgInfo), null, 2)
                          : "Sem resultado"}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="page-size">
              <label htmlFor="page-size">Itens por pagina</label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="page-controls">
              <button
                className="page-button"
                onClick={handlePreviousPage}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span>
                Pagina {page} de {totalPages}
              </span>
              <button
                className="page-button"
                onClick={handleNextPage}
                disabled={page === totalPages}
              >
                Proxima
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="state">Nenhuma mensagem registrada ainda.</p>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
