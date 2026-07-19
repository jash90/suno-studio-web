import { BookOpen, FileText } from "lucide-react";
import { LibraryDoc } from "../types";

/** Lista plików biblioteki z checkboxami — trzyma zbiór ODZNACZONYCH id
 *  (nowe pliki są domyślnie zaznaczone). Wspólny dla widoków Twórz i Album. */
export default function DocPicker({
  library,
  excludedIds,
  onChange,
}: {
  library: LibraryDoc[];
  excludedIds: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  return (
    <div className="doc-picker">
      <div className="doc-picker-actions">
        <button className="btn-link" onClick={() => onChange(new Set())}>
          zaznacz wszystkie
        </button>
        <button
          className="btn-link"
          onClick={() => onChange(new Set(library.map((d) => d.id)))}
        >
          odznacz wszystkie
        </button>
      </div>
      <ul className="doc-picker-list">
        {library.map((doc) => (
          <li key={doc.id}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!excludedIds.has(doc.id)}
                onChange={(e) => {
                  const next = new Set(excludedIds);
                  if (e.target.checked) next.delete(doc.id);
                  else next.add(doc.id);
                  onChange(next);
                }}
              />
              {doc.kind === "guide" ? (
                <BookOpen size={13} className="kind-guide" />
              ) : (
                <FileText size={13} className="kind-content" />
              )}
              <span className="file-name">{doc.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
